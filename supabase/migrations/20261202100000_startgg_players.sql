-- A saved list of the start.gg players Smashy has seen, so player search (Search > Players) can
-- find people by tag. start.gg's own API has no player search: it only finds a player by id or by
-- profile link, so until now a tag was looked for in the sign-up lists of recent tournaments only.
--
-- What's kept is only what start.gg shows publicly on brackets: the player id, the tag and the
-- sponsor prefix. No real names, photos, locations or results (results are still read from
-- start.gg when a player's page is opened).
--
-- Rows are added by the server as it reads start.gg (set pages, player pages, player searches)
-- and by scripts/seed/startgg-players.mjs, which fills in one region's recent tournaments.
--
-- `hidden` is the opt-out: a hidden player isn't listed in player search, has no player page and
-- no head-to-head card. A site admin sets it (Admin > People) when someone asks.
--
-- Server-only. Nobody reads or writes this table through the public API: row-level security is
-- on with no policies, and the visitor and signed-in roles have no rights on it. Nothing here
-- changes or deletes existing data.

create table public.startgg_players (
  player_id     bigint primary key, -- start.gg's player id
  tag           text not null check (char_length(tag) between 1 and 100),
  prefix        text check (prefix is null or char_length(prefix) <= 100),
  hidden        boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- "Tag contains ..." whatever the capitals (ILIKE uses this index).
create index startgg_players_tag_trgm_idx on public.startgg_players using gin (tag extensions.gin_trgm_ops);
-- The few hidden players, for the admin list.
create index startgg_players_hidden_idx on public.startgg_players (player_id) where hidden;

alter table public.startgg_players enable row level security;
revoke all on public.startgg_players from anon, authenticated;

-- The admin log also records hiding a player and listing them again (two new action names; the
-- rest of the list is unchanged).
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove_post', 'restore_post', 'dismiss_reports', 'remove_chat', 'close_lobby', 'dismiss_live', 'remove_highlight', 'hide_reel', 'remove_message', 'clear_profile', 'hide_event', 'hide_startgg_player', 'unhide_startgg_player'));
