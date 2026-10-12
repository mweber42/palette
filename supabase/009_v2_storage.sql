-- supabase/009_v2_storage.sql
-- Palette v2 — step 6 of 7: image storage.
-- Two public buckets (read by URL): `artworks` and `avatars`.
-- Size and type limits are enforced by Supabase Storage itself, so a
-- client can't bypass them. Large print files (> 1 MB) go through signed
-- upload URLs created by the server (fixes the 2026-09-29 finding where
-- big uploads crashed the Server Action).
--
-- Note: a public bucket serves any file whose URL is known. File names are
-- random UUIDs, so an unpublished artist's images are not discoverable, but
-- they are not secret either. Acceptable for artworks meant to be shown.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('artworks', 'artworks', true, 26214400, array['image/jpeg','image/png','image/webp']),
  ('avatars',  'avatars',  true,  5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads artwork and avatar images" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('artworks','avatars'));

-- Artworks: artists only, inside their own folder `<user_id>/...`.
create policy "artists upload into own artworks folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'artist')
  );
create policy "artists delete from own artworks folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars: any account, inside its own folder.
create policy "users upload into own avatars folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete from own avatars folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
