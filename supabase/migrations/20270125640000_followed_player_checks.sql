-- Round 799: a notice when a player you follow signs up for a tournament (Matthew, 2026-11-24). The daily job
-- looks at each followed player's upcoming tournaments on start.gg and remembers which ones it has already
-- seen, so a notice only goes out for a new one. The first look at a player only remembers (no notices for
-- tournaments they were already in). Written by the server only; nobody reads it from the app. Can be run again.

create table if not exists public.followed_player_checks (
  player_id text primary key check (player_id ~ '^[0-9]{1,12}$'),  -- the start.gg player id
  checked_at timestamptz not null default now(),
  known_slugs text[] not null default '{}'                          -- upcoming tournaments already seen
);

alter table public.followed_player_checks enable row level security;
revoke all on public.followed_player_checks from anon, authenticated;
