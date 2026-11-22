-- Regions (additive / backward compatible): Smashy for the whole smash community, not just Texas.

-- Where someone plays: a US state ("US-TX"), a Canadian province ("CA-ON") or a country ("JP").
-- Everyone who joined during the Texas beta starts as Texas; they can change it on Edit profile.
alter table public.profiles add column region text check (region is null or region ~ '^[A-Z]{2}(-[A-Z]{2})?$');
update public.profiles set region = 'US-TX' where region is null;
grant insert (region) on public.profiles to authenticated;
grant update (region) on public.profiles to authenticated;

-- Saved events lists per region (like events_sync for Texas): start.gg's searches are slow, so the
-- scheduled job and page views save the results here and pages read the saved copy.
-- Server-only (no access through the public API).
create table public.region_events (
  region text primary key check (region ~ '^[A-Z]{2}(-[A-Z]{2})?$'),
  data jsonb,
  saved_at timestamptz,
  last_run timestamptz not null default 'epoch',
  running_since timestamptz
);
alter table public.region_events enable row level security;
revoke all on public.region_events from anon, authenticated;
