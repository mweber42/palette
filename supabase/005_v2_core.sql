-- supabase/005_v2_core.sql
-- Palette v2 — step 2 of 7: accounts, profiles, moderation, artworks, tags.
-- Spec: claude/palette-v2-architecture-spec.md (§3, §4).
--
-- Structuring security rule (ADR-007): a table is EITHER publicly readable
-- (with a row filter) OR private — never both. RLS filters rows, not
-- columns: if a row is public, every column of it is readable through the
-- Supabase API. So anything private (moderation notes, rates, consents)
-- lives in its own table.
--
-- Internal helper functions live in the `private` schema, which is not
-- exposed by the Supabase API (only `public` is), so nobody can call them
-- directly over HTTP.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Admins, feature flags, settings, plans
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policy at all: nobody reads or writes this table through the API.
-- Marine adds herself once, from the SQL Editor (see the run guide).

-- Exposed on purpose (returns true/false for the CURRENT user only), so the
-- app can show or hide the admin link. security definer: it can read
-- `admins` even though RLS gives the caller no access to it.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- True when the caller is trusted:
--  * a direct database session with no API token at all (Supabase SQL
--    Editor, migrations, the Auth service creating a user) — every request
--    coming through the Supabase API carries JWT claims, even anonymous
--    ones ({"role":"anon"});
--  * the service_role key (server-side only);
--  * a logged-in admin.
create or replace function private.is_privileged()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''),
                  nullif(current_setting('request.jwt.claim.role', true), '')) is null
      or coalesce(auth.role(), '') = 'service_role'
      or public.is_admin();
$$;

create table public.feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text,
  updated_at  timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
create policy "anyone can read flags" on public.feature_flags
  for select to anon, authenticated using (true);
create policy "admins manage flags" on public.feature_flags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_feature_enabled(flag text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select enabled from public.feature_flags where key = flag), false);
$$;

create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "anyone can read settings" on public.app_settings
  for select to anon, authenticated using (true);
create policy "admins manage settings" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Monetization is prepared, not built (ADR-006): everyone is on 'free' and
-- this table stays empty for now.
create table public.plan_entitlements (
  plan        text not null,
  feature_key text not null,
  primary key (plan, feature_key)
);
alter table public.plan_entitlements enable row level security;
create policy "anyone can read entitlements" on public.plan_entitlements
  for select to anon, authenticated using (true);
create policy "admins manage entitlements" on public.plan_entitlements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Profiles (public when complete and not suspended)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  account_type       text not null check (account_type in ('artist','space','organization','member')),
  handle             text not null unique
                       check (handle ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  display_name       text not null default '',
  bio                text,
  city               text,
  region             text,
  country            text check (country is null or country ~ '^[A-Z]{2}$'),
  lang               text not null default 'en' check (lang in ('en','fr')),
  avatar_path        text,
  links              jsonb not null default '{}'::jsonb,
  -- Computed by trigger, never written by the client (see below).
  is_published       boolean not null default false,
  first_published_at timestamptz,
  -- Written by admins only.
  founding_member    boolean not null default false,
  plan               text not null default 'free',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.profile_moderation (
  profile_id       uuid primary key references public.profiles(id) on delete cascade,
  status           text not null default 'active' check (status in ('active','suspended')),
  seen_by_admin_at timestamptz,
  moderator_note   text,
  updated_at       timestamptz not null default now()
);
alter table public.profile_moderation enable row level security;

create table public.artist_details (
  profile_id          uuid primary key references public.profiles(id) on delete cascade,
  open_to_commissions boolean not null default false,
  collaboration_types text[] not null default '{}',
  languages           text[] not null default '{}'
);
alter table public.artist_details enable row level security;

create table public.artist_private (
  profile_id       uuid primary key references public.profiles(id) on delete cascade,
  rate_range       text,
  print_consent    boolean not null default false,
  print_consent_at timestamptz,
  phone            text
);
alter table public.artist_private enable row level security;

create table public.space_details (
  profile_id           uuid primary key references public.profiles(id) on delete cascade,
  space_type           text check (space_type in (
                         'gallery','popup','studio','residency','print_workshop',
                         'cultural_venue','hospitality','retail','workplace',
                         'event','public_space','institution','other')),
  address_public       text,
  hanging_surface_m2   integer check (hanging_surface_m2 is null or hanging_surface_m2 >= 0),
  exhibition_frequency text check (exhibition_frequency in
                         ('ongoing','monthly','quarterly','yearly','occasional')),
  audiences            text[] not null default '{}',
  -- No value lets a space charge the artist (ADR-004).
  artist_terms         text check (artist_terms in ('paid_fee','sales_commission','free_for_artist'))
);
alter table public.space_details enable row level security;

create table public.organization_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  sector     text,
  size_band  text check (size_band in ('1','2-10','11-50','51-250','250+')),
  needs      text[] not null default '{}'
);
alter table public.organization_details enable row level security;

create table public.organization_private (
  profile_id     uuid primary key references public.profiles(id) on delete cascade,
  typical_budget text
);
alter table public.organization_private enable row level security;

create table public.member_private (
  profile_id                uuid primary key references public.profiles(id) on delete cascade,
  onboarding_done           boolean not null default false,
  newsletter_consent        boolean not null default false,
  newsletter_consent_at     timestamptz,
  presale_notify_consent    boolean not null default false,
  presale_notify_consent_at timestamptz
);
alter table public.member_private enable row level security;

-- ---------------------------------------------------------------------------
-- Tags (controlled vocabulary, ADR-010) and artworks
-- ---------------------------------------------------------------------------

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('technique','style')),
  slug        text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$'),
  label_en    text not null,
  label_fr    text not null,
  status      text not null default 'active' check (status in ('active','proposed','merged')),
  merged_into uuid references public.tags(id),
  proposed_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.tags enable row level security;

create table public.artworks (
  id                 uuid primary key default gen_random_uuid(),
  artist_id          uuid not null references public.profiles(id) on delete cascade,
  slug               text not null unique,
  title              text not null default '',
  year               integer check (year is null or year between 1900 and 2100),
  width_cm           numeric(7,2) check (width_cm is null or width_cm > 0),
  height_cm          numeric(7,2) check (height_cm is null or height_cm > 0),
  image_path         text not null,
  original_available boolean not null default false,
  hd_file_available  boolean not null default false,
  -- "I want it" is on by default for every work not yet for sale
  -- (review 2026-10-12); the artist can switch it off per work.
  presale_enabled    boolean not null default true,
  -- Admin-only.
  review_status      text not null default 'live' check (review_status in ('live','hidden')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.artworks enable row level security;
create index artworks_artist_idx on public.artworks (artist_id);
create index artworks_created_idx on public.artworks (created_at desc);

create table public.artwork_tags (
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (artwork_id, tag_id)
);
alter table public.artwork_tags enable row level security;
create index artwork_tags_tag_idx on public.artwork_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- "Léa Martin!" -> "lea-martin"
create or replace function private.slugify(input text)
returns text
language sql immutable
as $$
  select trim(both '-' from
    regexp_replace(
      lower(translate(coalesce(input, ''),
        'àáâãäåāçćčèéêëēėęîïíīįìłñńôöòóœøōõßśšûüùúūÿýžźż',
        'aaaaaaacccdeeeeeeeiiiiiilnnooooooooossuuuuuyyzzz')),
      '[^a-z0-9]+', '-', 'g'));
$$;

-- A profile is public when it is complete AND not suspended (ADR-009).
create or replace function private.compute_is_published(
  p_id uuid, p_type text, p_name text, p_city text
)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  suspended boolean;
begin
  if p_type = 'member' or coalesce(trim(p_name), '') = '' then
    return false;
  end if;

  select status = 'suspended' into suspended
  from public.profile_moderation where profile_id = p_id;
  if coalesce(suspended, false) then
    return false;
  end if;

  if p_type = 'artist' then
    return (select count(*) from public.artworks a
            where a.artist_id = p_id and a.review_status = 'live') >= 3
       and exists (select 1 from public.artworks a
                   join public.artwork_tags at on at.artwork_id = a.id
                   join public.tags t on t.id = at.tag_id
                   where a.artist_id = p_id and a.review_status = 'live'
                     and t.kind = 'technique');
  elsif p_type = 'space' then
    return coalesce(trim(p_city), '') <> ''
       and exists (select 1 from public.space_details s
                   where s.profile_id = p_id and s.space_type is not null);
  elsif p_type = 'organization' then
    return exists (select 1 from public.organization_details o
                   where o.profile_id = p_id and coalesce(trim(o.sector), '') <> '');
  end if;
  return false;
end;
$$;

-- Asks the profile row to recompute itself (fires profiles_before_write).
create or replace function private.touch_profile(p_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.profiles set updated_at = now() where id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Before any insert/update on profiles:
--  * protected fields (account_type, founding_member, plan) are reset to
--    their previous value unless the caller is privileged. RLS lets an
--    owner update THEIR row, but not column by column — this trigger is
--    what stops `update profiles set account_type='artist'` sent directly
--    to the API (the hole found in the 2026-09-29 review);
--  * is_published / first_published_at are always recomputed, whoever the
--    caller is.
create or replace function private.profiles_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if not private.is_privileged() then
      new.account_type    := old.account_type;
      new.founding_member := old.founding_member;
      new.plan            := old.plan;
    end if;
    new.first_published_at := old.first_published_at;
    new.created_at         := old.created_at;
  else
    new.first_published_at := null;
  end if;

  new.is_published := private.compute_is_published(new.id, new.account_type, new.display_name, new.city);
  if new.is_published and new.first_published_at is null then
    new.first_published_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function private.profiles_before_write();

-- Any change that can affect completeness -> recompute the owner's profile.
create or replace function private.touch_owner_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  pid uuid;
begin
  if tg_table_name = 'artworks' then
    pid := coalesce(new.artist_id, old.artist_id);
  elsif tg_table_name = 'artwork_tags' then
    select artist_id into pid from public.artworks
    where id = coalesce(new.artwork_id, old.artwork_id);
  else
    pid := coalesce(new.profile_id, old.profile_id);
  end if;
  if pid is not null then
    perform private.touch_profile(pid);
  end if;
  return null;
end;
$$;

create trigger artworks_touch_profile after insert or update or delete on public.artworks
  for each row execute function private.touch_owner_profile();
create trigger artwork_tags_touch_profile after insert or delete on public.artwork_tags
  for each row execute function private.touch_owner_profile();
create trigger space_details_touch_profile after update on public.space_details
  for each row execute function private.touch_owner_profile();
create trigger organization_details_touch_profile after update on public.organization_details
  for each row execute function private.touch_owner_profile();
create trigger moderation_touch_profile after update on public.profile_moderation
  for each row execute function private.touch_owner_profile();

-- Artworks: generated slug, protected review_status, protected owner.
create or replace function private.artworks_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not private.is_privileged() then
      new.review_status := 'live';
    end if;
    new.slug := coalesce(nullif(private.slugify(new.title), ''), 'work')
                || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  else
    new.artist_id := old.artist_id;
    new.slug := old.slug;
    new.created_at := old.created_at;
    if not private.is_privileged() then
      new.review_status := old.review_status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger artworks_before_write
  before insert or update on public.artworks
  for each row execute function private.artworks_before_write();

-- Artwork tags: 1-3 techniques and up to 5 styles per artwork; a merged
-- tag can't be used; a proposed tag only by the artist who proposed it.
create or replace function private.artwork_tags_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  t record;
  owner uuid;
  n int;
begin
  select * into t from public.tags where id = new.tag_id;
  select artist_id into owner from public.artworks where id = new.artwork_id;

  if t.status = 'merged' then
    raise exception 'tag_merged' using errcode = 'check_violation';
  end if;
  if t.status = 'proposed' and t.proposed_by is distinct from owner then
    raise exception 'tag_not_available' using errcode = 'check_violation';
  end if;

  select count(*) into n from public.artwork_tags at
  join public.tags x on x.id = at.tag_id
  where at.artwork_id = new.artwork_id and x.kind = t.kind;

  if t.kind = 'technique' and n >= 3 then
    raise exception 'too_many_techniques' using errcode = 'check_violation';
  end if;
  if t.kind = 'style' and n >= 5 then
    raise exception 'too_many_styles' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger artwork_tags_before_insert
  before insert on public.artwork_tags
  for each row execute function private.artwork_tags_before_insert();

-- Tags proposed by artists: forced to 'proposed', attributed to the
-- proposer, max 10 proposals per artist per 24h (anti-spam).
create or replace function private.tags_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  recent int;
begin
  if private.is_privileged() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  new.status := 'proposed';
  new.proposed_by := auth.uid();
  new.merged_into := null;
  new.slug := private.slugify(new.label_en);
  select count(*) into recent from public.tags
  where proposed_by = auth.uid() and created_at > now() - interval '24 hours';
  if recent >= 10 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger tags_before_write
  before insert or update on public.tags
  for each row execute function private.tags_before_write();

-- Moderation rows: only privileged callers change them.
create or replace function private.moderation_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not private.is_privileged() then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger moderation_before_update
  before update on public.profile_moderation
  for each row execute function private.moderation_before_update();

-- Consent timestamps are set by the database, never trusted from the client.
create or replace function private.consent_timestamps()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_table_name = 'member_private' then
    if new.newsletter_consent and (tg_op = 'INSERT' or not old.newsletter_consent) then
      new.newsletter_consent_at := now();
    elsif not new.newsletter_consent then
      new.newsletter_consent_at := null;
    elsif tg_op = 'UPDATE' then
      new.newsletter_consent_at := old.newsletter_consent_at;
    end if;
    if new.presale_notify_consent and (tg_op = 'INSERT' or not old.presale_notify_consent) then
      new.presale_notify_consent_at := now();
    elsif not new.presale_notify_consent then
      new.presale_notify_consent_at := null;
    elsif tg_op = 'UPDATE' then
      new.presale_notify_consent_at := old.presale_notify_consent_at;
    end if;
  elsif tg_table_name = 'artist_private' then
    if new.print_consent and (tg_op = 'INSERT' or not old.print_consent) then
      new.print_consent_at := now();
    elsif not new.print_consent then
      new.print_consent_at := null;
    elsif tg_op = 'UPDATE' then
      new.print_consent_at := old.print_consent_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger member_private_consents before insert or update on public.member_private
  for each row execute function private.consent_timestamps();
create trigger artist_private_consents before insert or update on public.artist_private
  for each row execute function private.consent_timestamps();

-- Signup: creates the profile + its per-type rows from the metadata passed
-- to supabase.auth.signUp({ options: { data: { account_type, name, lang } } }).
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  acct text := coalesce(new.raw_user_meta_data->>'account_type', 'member');
  nm   text := coalesce(trim(new.raw_user_meta_data->>'name'), '');
  lg   text := coalesce(new.raw_user_meta_data->>'lang', 'en');
  base text;
begin
  if acct not in ('artist','space','organization','member') then
    raise exception 'invalid_account_type';
  end if;
  if acct = 'organization' and not public.is_feature_enabled('organization_accounts') then
    raise exception 'organization_accounts_disabled';
  end if;
  if lg not in ('en','fr') then
    lg := 'en';
  end if;

  base := left(coalesce(nullif(private.slugify(nm), ''), acct), 32);
  base := trim(both '-' from base);

  insert into public.profiles (id, account_type, display_name, lang, handle)
  values (new.id, acct, nm, lg,
          base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  if acct <> 'member' then
    insert into public.profile_moderation (profile_id) values (new.id);
  end if;

  if acct = 'artist' then
    insert into public.artist_details (profile_id) values (new.id);
    insert into public.artist_private (profile_id) values (new.id);
  elsif acct = 'space' then
    insert into public.space_details (profile_id) values (new.id);
  elsif acct = 'organization' then
    insert into public.organization_details (profile_id) values (new.id);
    insert into public.organization_private (profile_id) values (new.id);
  else
    insert into public.member_private (profile_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- profiles
create policy "public reads published profiles" on public.profiles
  for select to anon, authenticated using (is_published);
create policy "owner reads own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "owner updates own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins read all profiles" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "admins update profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- profile_moderation (private)
create policy "owner reads own moderation" on public.profile_moderation
  for select to authenticated using (profile_id = auth.uid());
create policy "admins manage moderation" on public.profile_moderation
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Per-type public details: readable when the profile is published.
create policy "public reads published artist details" on public.artist_details
  for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.is_published));
create policy "owner manages artist details" on public.artist_details
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "public reads published space details" on public.space_details
  for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.is_published));
create policy "owner manages space details" on public.space_details
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "public reads published organization details" on public.organization_details
  for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.is_published));
create policy "owner manages organization details" on public.organization_details
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Private per-type rows: owner (and admins) only.
create policy "owner manages artist private" on public.artist_private
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "owner manages organization private" on public.organization_private
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "owner manages member private" on public.member_private
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "admins read artist private" on public.artist_private
  for select to authenticated using (public.is_admin());
create policy "admins read member private" on public.member_private
  for select to authenticated using (public.is_admin());

-- tags
create policy "public reads usable tags" on public.tags
  for select to anon, authenticated using (status in ('active','proposed'));
create policy "admins read all tags" on public.tags
  for select to authenticated using (public.is_admin());
create policy "artists propose tags" on public.tags
  for insert to authenticated
  with check (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.account_type = 'artist'));
create policy "admins manage tags" on public.tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- artworks
create policy "public reads live artworks of published artists" on public.artworks
  for select to anon, authenticated
  using (review_status = 'live'
         and exists (select 1 from public.profiles p where p.id = artist_id and p.is_published));
create policy "artist reads own artworks" on public.artworks
  for select to authenticated using (artist_id = auth.uid());
create policy "artist inserts own artworks" on public.artworks
  for insert to authenticated
  with check (artist_id = auth.uid()
              and exists (select 1 from public.profiles p
                          where p.id = auth.uid() and p.account_type = 'artist'));
create policy "artist updates own artworks" on public.artworks
  for update to authenticated using (artist_id = auth.uid()) with check (artist_id = auth.uid());
create policy "artist deletes own artworks" on public.artworks
  for delete to authenticated using (artist_id = auth.uid());
create policy "admins manage artworks" on public.artworks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- artwork_tags
create policy "public reads tags of visible artworks" on public.artwork_tags
  for select to anon, authenticated
  using (exists (select 1 from public.artworks a
                 join public.profiles p on p.id = a.artist_id
                 where a.id = artwork_id and a.review_status = 'live' and p.is_published));
create policy "artist manages own artwork tags" on public.artwork_tags
  for all to authenticated
  using (exists (select 1 from public.artworks a where a.id = artwork_id and a.artist_id = auth.uid()))
  with check (exists (select 1 from public.artworks a where a.id = artwork_id and a.artist_id = auth.uid()));

-- Techniques and styles of an artist, derived from their artworks (no
-- double entry). security_invoker: RLS of the underlying tables applies.
create view public.artist_tags_summary with (security_invoker = true) as
  select a.artist_id, t.id as tag_id, t.kind, t.slug, t.label_en, t.label_fr,
         count(*)::int as artwork_count
  from public.artworks a
  join public.artwork_tags at on at.artwork_id = a.id
  join public.tags t on t.id = at.tag_id
  group by a.artist_id, t.id, t.kind, t.slug, t.label_en, t.label_fr;
