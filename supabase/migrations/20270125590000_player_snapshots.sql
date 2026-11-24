-- Saved copies of a player's start.gg lookup (docs/searchable-player-pages-plan.md, step S1).
--
-- A player page asks start.gg up to eight things per visit and only kept the answers in memory for a
-- few hours, so bots opening thousands of players used up the site's start.gg allowance. This table
-- keeps the last answer for good, so a later step can show guests the saved copy instead of asking.
--
-- Reached only by the server (the secret key): the page decides who may be shown (players who asked
-- not to be listed, members who hide their stats, teens), so the public API gets no access at all.
-- Safe to run twice.

create table if not exists public.player_snapshots (
  player_id bigint primary key,
  sets jsonb not null default '[]'::jsonb,     -- their most recent ~100 singles sets, as the page shows them
  results jsonb not null default '[]'::jsonb,  -- their latest ~20 placements
  saved_at timestamptz not null default now()
);

comment on table public.player_snapshots is
  'The last start.gg lookup of a player (recent sets and placements), saved so pages need not ask again. Server only.';

alter table public.player_snapshots enable row level security;
revoke all on public.player_snapshots from anon, authenticated;
