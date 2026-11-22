-- Smash history, step H3 (docs/archive-plan.md, Phase 2): full standings. Each saved bracket's top 64
-- (64 entrants: places 1st through 49th), read from start.gg's final standings, one request per bracket,
-- paced like the top 8s. Top 64 rather than every placing: a 2,000-entrant bracket would take ~30 requests
-- on start.gg's shared 80-a-minute key, and the top 64 is what historians cite. Facts only, from start.gg.

create table public.major_standings (
  major_slug text not null,
  event_id text not null,                          -- the major_events row (start.gg event id, or "manual-melee-1")
  startgg_event_id text not null,                  -- the start.gg event the standings were read from
  -- [{ "place": 9, "name": "Plup", "playerId": "1000" }, ...] best first; playerId is null for teams
  standings jsonb not null default '[]'::jsonb check (jsonb_typeof(standings) = 'array'),
  saved_at timestamptz not null default now(),
  primary key (major_slug, event_id),
  foreign key (major_slug, event_id) references public.major_events (major_slug, event_id) on delete cascade
);
-- "Every major this player placed at" (player pages' "Placings at majors").
create index major_standings_idx on public.major_standings using gin (standings jsonb_path_ops);

alter table public.major_standings enable row level security;
revoke all on public.major_standings from anon, authenticated;
grant select on public.major_standings to anon, authenticated;
create policy "Major standings are public" on public.major_standings for select to anon, authenticated using (true);
-- Writes happen on the server only (with the secret key).

-- When a major's standings were saved, and who's saving them right now (as for results).
alter table public.majors add column standings_saved_at timestamptz;
alter table public.majors add column standings_claimed_at timestamptz;

-- Hand-added brackets that round 526 matched to a start.gg tournament: which one, so their standings can
-- be read too (the biggest in-person singles event of that game, as round 526 chose).
alter table public.major_events add column startgg_tournament text check (startgg_tournament is null or startgg_tournament ~ '^[a-z0-9-]+$');
update public.major_events e
set startgg_tournament = v.tournament
from (values
  ('manual/2015-i-m-not-yelling', 'manual-melee-1', 'i-m-not-yelling-feat-armada'),
  ('manual/2015-htc-throwdown', 'manual-melee-1', 'htc-throwdown'),
  ('manual/2015-the-big-house-5', 'manual-melee-1', 'the-big-house-5'),
  ('manual/2015-the-big-house-5', 'manual-smash4-2', 'the-big-house-5'),
  ('manual/2015-smash-summit', 'manual-melee-1', 'smash-summit'),
  ('manual/2016-genesis-3', 'manual-melee-1', 'genesis-3'),
  ('manual/2016-genesis-3', 'manual-smash4-3', 'genesis-3'),
  ('manual/2016-genesis-3', 'manual-smash64-2', 'genesis-3'),
  ('manual/2016-shots-fired-2', 'manual-smash4-1', 'shots-fired-2'),
  ('manual/2016-battle-of-the-five-gods', 'manual-melee-1', 'battle-of-the-five-gods'),
  ('manual/2016-pound-2016', 'manual-melee-1', 'pound-2016'),
  ('manual/2016-pound-2016', 'manual-smash4-3', 'pound-2016'),
  ('manual/2016-pound-2016', 'manual-smash64-2', 'pound-2016'),
  ('manual/2016-get-on-my-level-2016', 'manual-melee-1', 'get-on-my-level-2016-good-game-con-ft-hbox-2'),
  ('manual/2016-get-on-my-level-2016', 'manual-smash4-3', 'get-on-my-level-2016-good-game-con-ft-hbox-2'),
  ('manual/2016-get-on-my-level-2016', 'manual-smash64-2', 'get-on-my-level-2016-good-game-con-ft-hbox-2'),
  ('manual/2016-ceo-2016', 'manual-melee-1', 'ceo-2016'),
  ('manual/2016-ceo-2016', 'manual-smash4-2', 'ceo-2016'),
  ('manual/2016-wtfox-2', 'manual-melee-1', 'wtfox-2'),
  ('manual/2016-2ggt-ktar-saga', 'manual-smash4-1', '2ggt-ktar-saga'),
  ('manual/2016-super-smash-con-2016', 'manual-brawl-3', 'super-smash-con-2016'),
  ('manual/2016-super-smash-con-2016', 'manual-melee-1', 'super-smash-con-2016'),
  ('manual/2016-super-smash-con-2016', 'manual-smash4-4', 'super-smash-con-2016'),
  ('manual/2016-super-smash-con-2016', 'manual-smash64-2', 'super-smash-con-2016'),
  ('manual/2016-shine-2016', 'manual-melee-1', 'shine-2016-1'),
  ('manual/2016-shine-2016', 'manual-smash64-2', 'shine-2016-1'),
  ('manual/2016-operation-desert-smash-ii', 'manual-smash64-1', 'operation-desert-smash-ii'),
  ('manual/2016-2ggt-abadango-saga', 'manual-smash4-1', '2ggt-abadango-saga'),
  ('manual/2016-the-big-house-6', 'manual-melee-1', 'the-big-house-6'),
  ('manual/2016-the-big-house-6', 'manual-smash4-2', 'the-big-house-6'),
  ('manual/2016-superboomed', 'manual-smash64-1', 'superboomed'),
  ('manual/2016-ktar-xix', 'manual-smash4-1', 'ktar-xix-ft-mkleo-nairo-salem-dabuz-zinoto-zero'),
  ('manual/2016-2ggt-zero-saga', 'manual-smash4-1', '2ggt-zero-saga-one-year-anniversary-1'),
  ('manual/2016-don-t-park-on-the-grass', 'manual-melee-1', 'don-t-park-on-the-grass')
) as v (major_slug, event_id, tournament)
where e.major_slug = v.major_slug and e.event_id = v.event_id;

-- Claims up to max_count majors from `slugs` whose results are saved but standings aren't, newest first:
-- start.gg majors, and hand-added ones with a bracket matched on start.gg. parry.gg majors aren't read yet.
create or replace function public.claim_major_standings(slugs text[], max_count int) returns setof text
  language sql security definer set search_path = ''
as $$
  update public.majors m set standings_claimed_at = now()
  where m.slug in (
    select j.slug from public.majors j
    where j.slug = any (slugs) and j.results_saved_at is not null and j.standings_saved_at is null
      and not j.hidden and j.slug not like 'parrygg/%'
      and (j.source <> 'manual' or exists (
        select 1 from public.major_events e where e.major_slug = j.slug and e.startgg_tournament is not null))
      and (j.standings_claimed_at is null or j.standings_claimed_at < now() - interval '10 minutes')
    order by j.start_at desc
    limit max_count
    for update skip locked
  )
  returning m.slug
$$;
revoke all on function public.claim_major_standings(text[], int) from public, anon, authenticated;
grant execute on function public.claim_major_standings(text[], int) to service_role;
