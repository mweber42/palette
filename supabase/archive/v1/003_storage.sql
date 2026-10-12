-- supabase/003_storage.sql
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do nothing;

create policy "public can view artwork images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'artworks');

-- account_type = 'artist' is checked here for the same reason as on the
-- artworks table (see 002_profiles_artworks.sql): without this clause, a
-- 'discovery' account can't write to the artworks table, but could still
-- upload files of any type into the public artworks bucket — for free and
-- unrelated to any artworks row. Found in independent review (2026-09-29).
create policy "artist owner can upload their own artwork images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'artist')
  );

create policy "artist owner can delete their own artwork images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'artist')
  );
