-- supabase/002_profiles_artworks.sql
-- Palette — artist/discovery accounts, scoped to the 2026-09-29 session.
-- Run once in Supabase → SQL Editor → New query → Run.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  account_type  text not null check (account_type in ('artist','discovery')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null default '',
  bio           text,
  medium        text,
  place         text,
  lang          text not null default 'en',
  status        text not null default 'draft'
                  check (status in ('draft','submitted','published_reviewed','published_auto','changes_requested')),
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewer_note text
);

create table if not exists public.artworks (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references auth.users(id) on delete cascade,
  image_path    text not null,
  title         text,
  review_status text not null default 'live',
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.artworks enable row level security;

-- Public read access: published artists only. 'discovery' accounts never
-- match this condition, whatever their internal status — so they're never
-- public.
create policy "public can read published artist profiles"
  on public.profiles for select
  to anon, authenticated
  using (account_type = 'artist' and status in ('published_reviewed','published_auto'));

create policy "public can read artworks of published artists"
  on public.artworks for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = artworks.artist_id
        and p.account_type = 'artist'
        and p.status in ('published_reviewed','published_auto')
    )
  );

-- The owner can read and update their own profile row.
create policy "owner can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "owner can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- The owner can manage their own artworks — BUT ONLY if they're an artist
-- account. Without the account_type clause here, a 'discovery' account
-- could technically insert artworks by bypassing the UI (they'd still own
-- the row, so they'd pass a simple "auth.uid() = artist_id" check). This
-- clause is what closes that hole.
create policy "artist owner can manage own artworks"
  on public.artworks for all
  to authenticated
  using (
    auth.uid() = artist_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type = 'artist'
    )
  )
  with check (
    auth.uid() = artist_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type = 'artist'
    )
  );

-- The "owner can update own profile" policy lets the owner update THEIR
-- row, but not column by column: without this trigger, they could just as
-- easily change their own status. The trigger resets
-- status/submitted_at/reviewed_at/reviewer_note to their previous value
-- unless the request comes from the service_role key (our future admin
-- Server Actions).
--
-- account_type is protected for the same reason, and it's the more
-- important of the two: without this line, any connected 'discovery'
-- account could self-promote to 'artist' with a single direct call to the
-- Supabase API (update profiles set account_type = 'artist' where id =
-- auth.uid()), which would completely bypass the RLS policy "artist owner
-- can manage own artworks" meant to prevent exactly that. Found in
-- independent review, fixed before any run against the real Supabase
-- project.
create or replace function public.protect_admin_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.account_type := old.account_type;
    new.status := old.status;
    new.submitted_at := old.submitted_at;
    new.reviewed_at := old.reviewed_at;
    new.reviewer_note := old.reviewer_note;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_profile_update_protect_admin_fields
  before update on public.profiles
  for each row execute function public.protect_admin_profile_fields();

-- Automatically creates the profile row at signup. Reads
-- account_type/name from the metadata passed to
-- supabase.auth.signUp({ options: { data } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, account_type, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'account_type', 'discovery'),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3-artwork floor, enforced continuously once the application has been
-- submitted (not before, and never when the account itself is being
-- deleted): any deletion that would bring a submitted artist down to 3
-- artworks or fewer is blocked.
--
-- Two exemptions found in independent review (2026-09-29), without which
-- this trigger blocks legitimate cases:
-- 1. Deleting an account (auth.users row deleted) cascades to its
--    artworks — without this early return, Marine could never delete a
--    test account, nor honor a GDPR deletion request, since the cascade
--    would always run into the floor.
-- 2. The floor only applies once `submitted_at` is set (application sent):
--    an artist still in draft with 1 or 2 artworks must be free to adjust
--    their first drafts.
create or replace function public.enforce_artwork_floor()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  remaining int;
  submitted timestamptz;
begin
  if not exists (select 1 from auth.users where id = old.artist_id) then
    return old;
  end if;

  select submitted_at into submitted from public.profiles where id = old.artist_id;
  if submitted is null then
    return old;
  end if;

  select count(*) into remaining from public.artworks where artist_id = old.artist_id;
  if remaining <= 3 then
    raise exception 'floor_reached: cannot go below 3 artworks';
  end if;
  return old;
end;
$$;

create trigger on_artwork_delete_check_floor
  before delete on public.artworks
  for each row execute function public.enforce_artwork_floor();
