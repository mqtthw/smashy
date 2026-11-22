-- A VOD library: members add a video link (YouTube, Twitch or Streamable) to a set, from a bracket
-- run on Smashy or from start.gg / parry.gg. The set's page plays it, and /vods lists them all,
-- searchable by player, tournament and game.
--
-- Each row keeps what the set was when the link was added (the players' names as anyone can see
-- them, the tournament, the round, the game, when it was played), so the list can be searched
-- without asking start.gg again.
--
-- Everyone can read the list. Nobody writes it directly: the site adds and removes links on the
-- server, after checking the person is signed in, the link is a video from an allowed site, the
-- set exists, and they haven't added too many today. A link can be removed by whoever added it,
-- or by a site admin.
--
-- Nothing here changes or deletes existing rows.

create table public.set_vods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('smashy', 'startgg', 'parrygg')),
  set_id text not null check (char_length(set_id) between 1 and 64),
  hosted_event_id uuid references public.hosted_events (id) on delete cascade, -- sets run on Smashy: their event (a hidden event hides its VODs)
  url text not null check (char_length(url) <= 300 and url ~ '^https://((www|m)\.)?(youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv|streamable\.com)/'),
  game text check (game is null or char_length(game) <= 20),
  p1_tag text check (p1_tag is null or char_length(p1_tag) <= 64),
  p2_tag text check (p2_tag is null or char_length(p2_tag) <= 64),
  p1_player text check (p1_player is null or char_length(p1_player) <= 64), -- start.gg player id, or the entry id on Smashy
  p2_player text check (p2_player is null or char_length(p2_player) <= 64),
  tournament text check (tournament is null or char_length(tournament) <= 200),
  round text check (round is null or char_length(round) <= 80),
  played_at timestamptz,
  added_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source, set_id, url)
);
create index set_vods_set_idx on public.set_vods (source, set_id);
create index set_vods_recent_idx on public.set_vods (created_at desc);
create index set_vods_added_by_idx on public.set_vods (added_by, created_at desc);
create index set_vods_p1_idx on public.set_vods (p1_player) where p1_player is not null;
create index set_vods_p2_idx on public.set_vods (p2_player) where p2_player is not null;

alter table public.set_vods enable row level security;
revoke all on public.set_vods from anon, authenticated;
grant select (id, source, set_id, hosted_event_id, url, game, p1_tag, p2_tag, p1_player, p2_player, tournament, round, played_at, created_at) on public.set_vods to anon, authenticated;
-- Who added a link isn't public (only the server reads it, to let them remove it).
create policy "VODs are public" on public.set_vods for select using (true);
