-- Palette — Supabase schema
-- Run this once in your Supabase project's SQL editor (Project → SQL Editor → New query).
-- Creates the two tables the app writes to, with Row Level Security locked
-- down so the public anon key can only INSERT — never read, update, or
-- delete — other people's applications or email addresses.

create table if not exists public.artist_applications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  portfolio   text,
  medium      text,
  place       text,
  bio         text,
  lang        text not null default 'en',
  status      text not null default 'new' -- new | reviewed | accepted | declined (edit later from the Table Editor)
);

create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null unique
);

alter table public.artist_applications enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- Anyone (the public anon key used by the deployed site) may INSERT...
create policy "public can submit an application"
  on public.artist_applications for insert
  to anon
  with check (true);

create policy "public can subscribe"
  on public.newsletter_subscribers for insert
  to anon
  with check (true);

-- ...but nobody using the anon key can read, edit, or delete rows.
-- View and manage submissions yourself from the Supabase Table Editor
-- (that uses your own login, not the anon key, so RLS doesn't apply to you).
