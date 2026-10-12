-- supabase/006_v2_engagement.sql
-- Palette v2 — step 3 of 7: likes, collections, purchase intents, feed.
-- Spec §3.5 and §6. ADR-002 (intents, no payment), ADR-003 (no public
-- popularity ranking: like counts are never publicly readable).

-- ---------------------------------------------------------------------------
-- Likes (private: each user sees their own; artists get aggregates below)
-- ---------------------------------------------------------------------------

create table public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);
alter table public.likes enable row level security;
create index likes_artwork_idx on public.likes (artwork_id);

create policy "user reads own likes" on public.likes
  for select to authenticated using (user_id = auth.uid());
create policy "user likes visible artworks of others" on public.likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_feature_enabled('likes')
    and exists (select 1 from public.artworks a
                join public.profiles p on p.id = a.artist_id
                where a.id = artwork_id and a.review_status = 'live'
                  and p.is_published and a.artist_id <> auth.uid())
  );
create policy "user removes own likes" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Collections (private for now)
-- ---------------------------------------------------------------------------

create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.collections enable row level security;
create index collections_owner_idx on public.collections (owner_id);

create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  artwork_id    uuid not null references public.artworks(id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, artwork_id)
);
alter table public.collection_items enable row level security;

create policy "owner manages collections" on public.collections
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.is_feature_enabled('collections'));

create policy "owner manages collection items" on public.collection_items
  for all to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Print formats and purchase intents (no payment, no commitment)
-- ---------------------------------------------------------------------------

create table public.print_formats (
  code                   text primary key,
  label                  text not null,
  -- NULL until Marine confirms real prices: the UI then shows no price.
  indicative_price_cents integer check (indicative_price_cents is null or indicative_price_cents > 0),
  sort_order             integer not null default 0,
  active                 boolean not null default true
);
alter table public.print_formats enable row level security;
create policy "anyone reads formats" on public.print_formats
  for select to anon, authenticated using (true);
create policy "admins manage formats" on public.print_formats
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.purchase_intents (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  artwork_id           uuid not null references public.artworks(id) on delete cascade,
  -- Optional: "I want it" is one click, no format to choose (review
  -- 2026-10-12). The format can be asked when sales open.
  format_code          text references public.print_formats(code),
  price_snapshot_cents integer,
  status               text not null default 'active' check (status in ('active','cancelled','converted')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.purchase_intents enable row level security;
-- One active wish per person and artwork.
create unique index purchase_intents_one_active
  on public.purchase_intents (user_id, artwork_id) where status = 'active';
create index purchase_intents_artwork_idx on public.purchase_intents (artwork_id);

-- The price snapshot comes from print_formats, never from the client; a
-- user can only cancel (or re-activate) their own intent.
create or replace function private.purchase_intents_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    select indicative_price_cents into new.price_snapshot_cents
    from public.print_formats where code = new.format_code;
    new.status := 'active';
    new.created_at := now();
  else
    new.user_id := old.user_id;
    new.artwork_id := old.artwork_id;
    new.format_code := old.format_code;
    new.price_snapshot_cents := old.price_snapshot_cents;
    new.created_at := old.created_at;
    if not private.is_privileged() and new.status not in ('active','cancelled') then
      new.status := old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger purchase_intents_before_write
  before insert or update on public.purchase_intents
  for each row execute function private.purchase_intents_before_write();

create policy "user reads own intents" on public.purchase_intents
  for select to authenticated using (user_id = auth.uid());
create policy "user creates intents on presale artworks" on public.purchase_intents
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_feature_enabled('presale_intents')
    and (format_code is null
         or exists (select 1 from public.print_formats f where f.code = format_code and f.active))
    and exists (select 1 from public.artworks a
                join public.profiles p on p.id = a.artist_id
                where a.id = artwork_id and a.presale_enabled and a.review_status = 'live'
                  and p.is_published and a.artist_id <> auth.uid())
  );
create policy "user updates own intents" on public.purchase_intents
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins read intents" on public.purchase_intents
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Aggregated stats for the artist's own dashboard (never public)
-- ---------------------------------------------------------------------------

create or replace function public.my_artwork_stats()
returns table (artwork_id uuid, likes integer, active_intents integer, intents_by_format jsonb)
language sql stable security definer set search_path = public
as $$
  select a.id,
         (select count(*)::int from public.likes l where l.artwork_id = a.id),
         (select count(*)::int from public.purchase_intents i
            where i.artwork_id = a.id and i.status = 'active'),
         coalesce((select jsonb_object_agg(coalesce(format_code, 'any'), n) from (
                     select i.format_code, count(*)::int as n
                     from public.purchase_intents i
                     where i.artwork_id = a.id and i.status = 'active'
                     group by i.format_code) s), '{}'::jsonb)
  from public.artworks a
  where a.artist_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Public like counts, by order of magnitude only (review 2026-10-12,
-- ADR-011 amends ADR-003): exact counts stay private to the artist; the
-- public sees nothing under 10, then 10+, 20+, 50+, 100+, 200+, 500+, 1K+…
-- Display only: nothing is ever sorted or ranked by likes.
-- ---------------------------------------------------------------------------

create or replace function private.like_bucket(n bigint)
returns text
language plpgsql immutable
as $$
declare
  step bigint := 10;
  best bigint := null;
begin
  if n < 10 then
    return null;
  end if;
  while step <= n loop
    best := step;
    if step * 2 <= n then best := step * 2; end if;
    if step * 5 <= n then best := step * 5; end if;
    step := step * 10;
  end loop;
  if best >= 1000000 then
    return (best / 1000000)::text || 'M+';
  elsif best >= 1000 then
    return (best / 1000)::text || 'K+';
  end if;
  return best::text || '+';
end;
$$;

create or replace function public.artwork_like_buckets(p_ids uuid[])
returns table (artwork_id uuid, likes_label text)
language sql stable security definer set search_path = public
as $$
  select a.id, private.like_bucket((select count(*) from public.likes l where l.artwork_id = a.id))
  from public.artworks a
  join public.profiles p on p.id = a.artist_id
  where a.id = any(p_ids) and a.review_status = 'live' and p.is_published;
$$;

-- ---------------------------------------------------------------------------
-- Notifications (in-app first; email / SMS on request, review 2026-10-12)
-- ---------------------------------------------------------------------------

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email      boolean not null default false,
  sms        boolean not null default false,
  phone      text check (phone is null or phone ~ '^\+?[0-9 .-]{6,20}$'),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy "owner manages notification preferences" on public.notification_preferences
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('presale_available','welcome','system')),
  artwork_id uuid references public.artworks(id) on delete cascade,
  title_en   text not null,
  title_fr   text not null,
  body_en    text,
  body_fr    text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Users read their notifications and mark them read; only the server
-- (or Marine) creates them.
create policy "user reads own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "user marks own notifications read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins manage notifications" on public.notifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function private.notifications_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not private.is_privileged() then
    new.user_id := old.user_id; new.kind := old.kind; new.artwork_id := old.artwork_id;
    new.title_en := old.title_en; new.title_fr := old.title_fr;
    new.body_en := old.body_en; new.body_fr := old.body_fr; new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger notifications_before_update
  before update on public.notifications
  for each row execute function private.notifications_before_update();

-- Every account gets a preferences row; existing ones are backfilled.
create or replace function private.create_notification_preferences()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notification_preferences (profile_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger profiles_create_notification_preferences
  after insert on public.profiles
  for each row execute function private.create_notification_preferences();
insert into public.notification_preferences (profile_id)
  select id from public.profiles on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Feed v0 (spec §6) — no global popularity ranking anywhere.
--   * anonymous visitor, or a user with no likes yet: newest first;
--   * otherwise: (1 - ratio) "taste" items (artworks sharing the most tags
--     with what the user liked) interleaved with `ratio` "discovery" items
--     (artworks sharing none of those tags), in a pseudo-random order that
--     is stable for the day (so pagination stays consistent).
-- security invoker: RLS applies, so only visible artworks can come out.
-- ---------------------------------------------------------------------------

create or replace function public.get_feed(p_limit integer default 24, p_offset integer default 0)
returns table (artwork_id uuid, artist_id uuid, reason text)
language plpgsql stable security invoker set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ratio numeric;
  has_likes boolean;
begin
  p_limit := least(greatest(coalesce(p_limit, 24), 1), 100);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  if uid is not null then
    select exists (select 1 from public.likes where user_id = uid) into has_likes;
  else
    has_likes := false;
  end if;

  if not has_likes then
    return query
      select a.id, a.artist_id, 'recent'::text
      from public.artworks a
      where uid is null or a.artist_id <> uid
      order by a.created_at desc, a.id
      limit p_limit offset p_offset;
    return;
  end if;

  select least(greatest(coalesce((value #>> '{}')::numeric, 0.3), 0), 1)
    into ratio from public.app_settings where key = 'feed.discovery_ratio';
  ratio := coalesce(ratio, 0.3);

  return query
  with liked_tags as (
    select at.tag_id, count(*) as w
    from public.likes l
    join public.artwork_tags at on at.artwork_id = l.artwork_id
    where l.user_id = uid
    group by at.tag_id
  ),
  candidates as (
    select a.id, a.artist_id,
           coalesce((select sum(lt.w) from public.artwork_tags at
                     join liked_tags lt on lt.tag_id = at.tag_id
                     where at.artwork_id = a.id), 0) as score,
           md5(a.id::text || uid::text || current_date::text) as daily_rand
    from public.artworks a
    where a.artist_id <> uid
      and not exists (select 1 from public.likes l where l.user_id = uid and l.artwork_id = a.id)
  ),
  ranked as (
    select c.id, c.artist_id,
           case when c.score > 0 then 'taste' else 'discovery' end as why,
           row_number() over (
             partition by (c.score > 0)
             order by c.score desc, c.daily_rand
           ) as rn
    from candidates c
  )
  select r.id, r.artist_id, r.why
  from ranked r
  order by
    case when r.why = 'taste'
         then r.rn / nullif(1 - ratio, 0)
         else r.rn / nullif(ratio, 0) end nulls last,
    r.why, r.id
  limit p_limit offset p_offset;
end;
$$;
