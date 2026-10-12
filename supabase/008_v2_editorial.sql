-- supabase/008_v2_editorial.sql
-- Palette v2 — step 5 of 7: editorial (Vernissage, Accrochage) and reports.
-- ADR-003: highlighted artists are chosen by a person; signals inform,
-- they don't decide.

-- Vernissage (weekly, automatic): artists first published in the last 7
-- days, newest first. A view, not a table — nothing to maintain by hand.
create view public.vernissage_artists with (security_invoker = true) as
  select p.id, p.handle, p.display_name, p.city, p.country, p.avatar_path, p.first_published_at
  from public.profiles p
  where p.account_type = 'artist' and p.is_published
    and p.first_published_at > now() - interval '7 days'
  order by p.first_published_at desc;

-- Accrochage (monthly, editorial)
create table public.features (
  id               uuid primary key default gen_random_uuid(),
  number           integer not null unique check (number > 0),
  slug             text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$'),
  title_en         text not null,
  title_fr         text not null,
  intro_en         text,
  intro_fr         text,
  body_en          text,
  body_fr          text,
  cover_artwork_id uuid references public.artworks(id) on delete set null,
  period_label     text not null,
  published_at     timestamptz,
  created_at       timestamptz not null default now()
);
alter table public.features enable row level security;

create table public.feature_items (
  feature_id           uuid not null references public.features(id) on delete cascade,
  profile_id           uuid not null references public.profiles(id) on delete cascade,
  position             integer not null default 0,
  note_en              text,
  note_fr              text,
  highlight_artwork_id uuid references public.artworks(id) on delete set null,
  primary key (feature_id, profile_id)
);
alter table public.feature_items enable row level security;

create policy "public reads published features" on public.features
  for select to anon, authenticated
  using (published_at is not null and published_at <= now() and public.is_feature_enabled('journal'));
create policy "admins manage features" on public.features
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads items of published features" on public.feature_items
  for select to anon, authenticated
  using (exists (select 1 from public.features f
                 where f.id = feature_id and f.published_at is not null
                   and f.published_at <= now() and public.is_feature_enabled('journal')));
create policy "admins manage feature items" on public.feature_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Content reports (hosting-provider obligation under the EU DSA).
create table public.moderation_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('profile','artwork','opportunity')),
  target_id   uuid not null,
  reason      text not null check (reason in ('not_original','ai_generated','offensive','spam','other')),
  details     text check (details is null or length(details) <= 2000),
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at  timestamptz not null default now()
);
alter table public.moderation_reports enable row level security;

-- Max 20 reports per user per 24h; status is admin-only.
create or replace function private.reports_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not private.is_privileged() then
    new.status := 'open';
    new.reporter_id := auth.uid();
    if (select count(*) from public.moderation_reports
        where reporter_id = auth.uid() and created_at > now() - interval '24 hours') >= 20 then
      raise exception 'rate_limited' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.moderation_reports
  for each row execute function private.reports_before_insert();

create policy "logged-in users report content" on public.moderation_reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "admins manage reports" on public.moderation_reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
