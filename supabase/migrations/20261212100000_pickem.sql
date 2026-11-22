-- Pick'em for majors: before a major's singles event starts, members pick the champion and their
-- top 8 from its top seeds. After it starts, everyone's picks show on a leaderboard, scored from
-- start.gg's final standings once it's over. No money, no prizes: bragging rights.
--
-- One row per member per start.gg event. The players picked are kept as start.gg player ids with
-- their tags (so the leaderboard shows names without asking start.gg again), plus what the event
-- was (its name, tournament, game) and when picks lock (its start time).
--
-- Nobody reads or writes this table directly: the site saves picks on the server (checking the
-- player is in the event's top seeds and the event hasn't started), and shows everyone's picks only
-- once they're locked, so nobody can copy before the start.
--
-- Nothing here changes or deletes existing rows.

create table public.pickem_picks (
  event_id bigint not null check (event_id > 0), -- start.gg event id
  user_id uuid not null references public.profiles (id) on delete cascade,
  champion text not null check (champion ~ '^\d{1,12}$'), -- start.gg player id
  top8 text[] not null check (cardinality(top8) between 1 and 8 and array_to_string(top8, ',') ~ '^\d{1,12}(,\d{1,12})*$'),
  tags jsonb not null default '{}'::jsonb check (jsonb_typeof(tags) = 'object'), -- player id -> tag, as start.gg had it
  event_name text not null check (char_length(event_name) <= 200),
  tournament text not null check (char_length(tournament) <= 200),
  tournament_slug text check (tournament_slug is null or char_length(tournament_slug) <= 200),
  game text check (game is null or char_length(game) <= 20),
  locks_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id),
  check (champion = any (top8))
);
create index pickem_picks_user_idx on public.pickem_picks (user_id, locks_at desc);

alter table public.pickem_picks enable row level security;
revoke all on public.pickem_picks from anon, authenticated;
-- No policies on purpose: only the server touches this table.
