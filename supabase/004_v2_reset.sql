-- supabase/004_v2_reset.sql
-- Palette v2 — step 1 of 7. Run in Supabase → SQL Editor, in numeric order.
--
-- Removes the v1 accounts objects (002_profiles_artworks.sql and
-- 003_storage.sql, now archived in supabase/archive/v1/). Those two files
-- were never run on the real project, so on a fresh project every line
-- below is a no-op: `if exists` makes this script safe either way.
--
-- NOT touched on purpose: artist_applications and newsletter_subscribers
-- (schema.sql) — they hold real submissions and stay as-is.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_admin_profile_fields() cascade;
drop function if exists public.enforce_artwork_floor() cascade;

drop table if exists public.artworks cascade;
drop table if exists public.profiles cascade;

drop policy if exists "public can view artwork images" on storage.objects;
drop policy if exists "owner can upload their own artwork images" on storage.objects;
drop policy if exists "owner can delete their own artwork images" on storage.objects;
drop policy if exists "artist owner can upload their own artwork images" on storage.objects;
drop policy if exists "artist owner can delete their own artwork images" on storage.objects;
