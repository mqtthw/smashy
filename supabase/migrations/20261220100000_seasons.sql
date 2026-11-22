-- Seasons and rankings: a scene's own ranking (docs/seasons-plan.md). A member creates a season, adds
-- co-admins, adds events (Smashy brackets or start.gg events, with their final standings saved), and
-- sets a points table. Smashy adds up the standings. It's the scene's ranking, run by its admins.
--
-- Only the server reads and writes these tables (like pr_names): the site checks who is an admin,
-- applies the teen rule (teens' names only for signed-in viewers) and the naming checks. Four new
-- tables; nothing existing changes and no data is touched.

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  region text check (region is null or char_length(region) <= 10),
  starts_on date not null,
  ends_on date not null,
  -- The points table: [[from place, points], ...], best place first; e.g. [[1,100],[2,80],[3,65]].
  points jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 1 and 40),
  best_of int check (best_of is null or best_of between 1 and 200), -- only a player's best N events count
  min_events int not null default 1 check (min_events between 1 and 50), -- to be ranked
  visibility text not null default 'public' check (visibility in ('public', 'unlisted')),
  removed_at timestamptz, -- taken down by a moderator
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 731)
);
create index seasons_owner_idx on public.seasons (owner_id, created_at desc);
create index seasons_list_idx on public.seasons (game, ends_on desc) where removed_at is null and visibility = 'public';

create table public.season_admins (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
create index season_admins_user_idx on public.season_admins (user_id);

create table public.season_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  source text not null check (source in ('smashy', 'startgg')),
  ref text not null check (char_length(ref) between 1 and 80), -- the hosted event id, or the start.gg event id
  name text not null check (char_length(btrim(name)) between 1 and 160),
  held_on date not null,
  entrants int check (entrants is null or entrants between 0 and 4096),
  weight numeric(4, 2) not null default 1 check (weight between 0.25 and 5),
  -- The final standings, saved when added: [{"key": "u:…|s:…|g:…", "name": "…", "place": 1}, ...].
  results jsonb not null check (jsonb_typeof(results) = 'array' and jsonb_array_length(results) <= 1024),
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  unique (season_id, source, ref)
);
create index season_events_season_idx on public.season_events (season_id, held_on);

create table public.season_players (
  season_id uuid not null references public.seasons (id) on delete cascade,
  player_key text not null check (char_length(player_key) between 3 and 80),
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  merged_into text check (merged_into is null or char_length(merged_into) between 3 and 80),
  left_out boolean not null default false, -- e.g. a player who asked not to be listed
  updated_at timestamptz not null default now(),
  primary key (season_id, player_key),
  check (merged_into is null or merged_into <> player_key)
);

alter table public.seasons enable row level security;
alter table public.season_admins enable row level security;
alter table public.season_events enable row level security;
alter table public.season_players enable row level security;
revoke all on public.seasons, public.season_admins, public.season_events, public.season_players from anon, authenticated;
-- No policies on purpose: only the server touches these tables.
