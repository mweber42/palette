-- supabase/007_v2_opportunities.sql
-- Palette v2 — step 4 of 7: opportunities, responses, contact requests.
-- Modeled now, switched OFF at launch (flags `opportunities`,
-- `organization_accounts`, `contact_requests`). Every write below also
-- checks its flag in the database, so turning a flag off really closes the
-- feature, even for someone calling the API directly.
-- ADR-004: every opportunity is paid (budget > 0) and reviewed by a person
-- before publication. ADR-008: contacts are relayed by email, no messaging.

create table public.opportunities (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles(id) on delete cascade,
  type             text not null check (type in ('commission','freelance_mission','job',
                     'exhibition_call','residency_call','event_call')),
  title            text not null check (length(trim(title)) between 3 and 140),
  description      text not null check (length(trim(description)) >= 20),
  location_mode    text not null default 'onsite' check (location_mode in ('onsite','remote','hybrid')),
  city             text,
  country          text check (country is null or country ~ '^[A-Z]{2}$'),
  budget_min_cents integer not null check (budget_min_cents > 0),
  budget_max_cents integer not null check (budget_max_cents >= budget_min_cents),
  budget_unit      text not null default 'total' check (budget_unit in ('total','day','month','year')),
  deadline         date,
  status           text not null default 'submitted'
                     check (status in ('draft','submitted','published','rejected','closed','expired')),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.opportunities enable row level security;
create index opportunities_status_idx on public.opportunities (status, published_at desc);

-- Authors can draft, submit or close; only admins publish or reject.
create or replace function private.opportunities_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.author_id := old.author_id;
    new.created_at := old.created_at;
  end if;
  if not private.is_privileged() then
    if new.status not in ('draft','submitted','closed') then
      new.status := case when tg_op = 'UPDATE' then old.status else 'submitted' end;
    end if;
    new.published_at := case when tg_op = 'UPDATE' then old.published_at else null end;
  elsif new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger opportunities_before_write
  before insert or update on public.opportunities
  for each row execute function private.opportunities_before_write();

create policy "public reads published opportunities" on public.opportunities
  for select to anon, authenticated
  using (status = 'published' and public.is_feature_enabled('opportunities'));
create policy "author reads own opportunities" on public.opportunities
  for select to authenticated using (author_id = auth.uid());
create policy "published spaces and organizations post opportunities" on public.opportunities
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_feature_enabled('opportunities')
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.is_published
                  and p.account_type in ('space','organization'))
  );
create policy "author updates own opportunities" on public.opportunities
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "admins manage opportunities" on public.opportunities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Responses (named so as not to clash with the existing artist_applications)
create table public.opportunity_responses (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  artist_id      uuid not null references public.profiles(id) on delete cascade,
  message        text not null check (length(trim(message)) between 1 and 4000),
  status         text not null default 'sent' check (status in ('sent','viewed','shortlisted','declined')),
  created_at     timestamptz not null default now(),
  unique (opportunity_id, artist_id)
);
alter table public.opportunity_responses enable row level security;

-- The applicant can't change anything after sending; the author can only
-- move the status.
create or replace function private.responses_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not private.is_privileged() then
    new.opportunity_id := old.opportunity_id;
    new.artist_id := old.artist_id;
    new.message := old.message;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger responses_before_update
  before update on public.opportunity_responses
  for each row execute function private.responses_before_update();

create policy "published artists respond to published opportunities" on public.opportunity_responses
  for insert to authenticated
  with check (
    artist_id = auth.uid()
    and public.is_feature_enabled('opportunities')
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.is_published and p.account_type = 'artist')
    and exists (select 1 from public.opportunities o
                where o.id = opportunity_id and o.status = 'published')
  );
create policy "applicant reads own responses" on public.opportunity_responses
  for select to authenticated using (artist_id = auth.uid());
create policy "author reads responses to own opportunities" on public.opportunity_responses
  for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.author_id = auth.uid()));
create policy "author updates response status" on public.opportunity_responses
  for update to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.author_id = auth.uid()))
  with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.author_id = auth.uid()));

-- Contact requests (relayed by email by the app, ADR-008)
create table public.contact_requests (
  id                     uuid primary key default gen_random_uuid(),
  from_id                uuid not null references public.profiles(id) on delete cascade,
  to_id                  uuid not null references public.profiles(id) on delete cascade,
  context_opportunity_id uuid references public.opportunities(id) on delete set null,
  subject                text not null check (length(trim(subject)) between 1 and 140),
  message                text not null check (length(trim(message)) between 1 and 4000),
  status                 text not null default 'sent' check (status in ('sent','delivered','failed')),
  created_at             timestamptz not null default now(),
  check (from_id <> to_id)
);
alter table public.contact_requests enable row level security;
create index contact_requests_from_idx on public.contact_requests (from_id, created_at desc);

-- Max 10 contact requests per sender per 24h.
create or replace function private.contact_requests_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.contact_requests
      where from_id = new.from_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  new.status := 'sent';
  return new;
end;
$$;

create trigger contact_requests_rate_limit
  before insert on public.contact_requests
  for each row execute function private.contact_requests_rate_limit();

-- Spaces/organizations contact artists; artists contact spaces/organizations.
create policy "published accounts send contact requests" on public.contact_requests
  for insert to authenticated
  with check (
    from_id = auth.uid()
    and public.is_feature_enabled('contact_requests')
    and exists (
      select 1 from public.profiles s, public.profiles r
      where s.id = auth.uid() and r.id = to_id and s.is_published and r.is_published
        and ((s.account_type in ('space','organization') and r.account_type = 'artist')
          or (s.account_type = 'artist' and r.account_type in ('space','organization')))
    )
  );
create policy "sender and recipient read contact requests" on public.contact_requests
  for select to authenticated using (from_id = auth.uid() or to_id = auth.uid());
