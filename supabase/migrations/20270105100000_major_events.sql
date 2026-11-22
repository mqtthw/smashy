-- Smash history, step A2 (docs/archive-plan.md): each archived major's events, saved once.
-- One row per start.gg event in a Smash game: its game, entrant count and top 8 (names as start.gg
-- shows them, plus the start.gg player id for player careers later). Facts only, from start.gg.
-- The server fills it in the background, a few majors at a time, after someone opens a year.

create table public.major_events (
  major_slug text not null references public.majors (slug) on delete cascade,
  event_id text not null,                          -- start.gg event id
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  name text not null,                              -- "Melee Singles"
  entrants int,
  teams boolean not null default false,            -- doubles / crews (names are team names)
  online boolean not null default false,
  -- [{ "place": 1, "name": "PG | Plup", "playerId": "1000" }, ...]; playerId is null for teams
  top8 jsonb not null default '[]'::jsonb check (jsonb_typeof(top8) = 'array'),
  saved_at timestamptz not null default now(),
  primary key (major_slug, event_id)
);
-- "Every major this player placed at" (player careers, step A5).
create index major_events_top8_idx on public.major_events using gin (top8 jsonb_path_ops);

alter table public.major_events enable row level security;
revoke all on public.major_events from anon, authenticated;
grant select on public.major_events to anon, authenticated;
create policy "Major results are public" on public.major_events for select to anon, authenticated using (true);
-- Writes happen on the server only (with the secret key).

-- When a major's results were saved, and who's saving them right now (a claim older than
-- 10 minutes counts as dead), so two servers never fetch the same major.
alter table public.majors add column results_saved_at timestamptz;
alter table public.majors add column results_claimed_at timestamptz;

-- Claims up to max_count finished majors from `slugs` whose results aren't saved yet, newest first.
create or replace function public.claim_major_results(slugs text[], max_count int) returns setof text
  language sql security definer set search_path = ''
as $$
  update public.majors m set results_claimed_at = now()
  where m.slug in (
    select slug from public.majors
    where slug = any (slugs) and results_saved_at is null and end_at < now()
      and (results_claimed_at is null or results_claimed_at < now() - interval '10 minutes')
    order by start_at desc
    limit max_count
    for update skip locked
  )
  returning m.slug
$$;
revoke all on function public.claim_major_results(text[], int) from public, anon, authenticated;
grant execute on function public.claim_major_results(text[], int) to service_role;
