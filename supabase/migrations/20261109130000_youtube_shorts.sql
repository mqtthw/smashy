-- Reels: YouTube Shorts alongside Twitch clips.
-- A YouTube channel is a reel_channels row with platform 'youtube'; its "login" is the channel id
-- (UC + 22 characters), which can't clash with a Twitch login (those are lowercase). Admins add
-- YouTube channels by hand (nothing is suggested automatically) and can give each a usual game,
-- used when a Short's title doesn't say which game it is.
alter table public.reel_channels
  add column platform text not null default 'twitch' check (platform in ('twitch', 'youtube')),
  add column default_game text check (default_game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4'));
alter table public.reel_channels drop constraint reel_channels_login_check;
alter table public.reel_channels add constraint reel_channels_login_check check (
  (platform = 'twitch' and login ~ '^[a-z0-9_]{2,25}$')
  or (platform = 'youtube' and login ~ '^UC[A-Za-z0-9_-]{22}$')
);

-- A Short's clip_id is its YouTube video id.
alter table public.reels add column platform text not null default 'twitch' check (platform in ('twitch', 'youtube'));

-- Ranking: Shorts get far more views than Twitch clips (YouTube shows them to everyone), so a
-- Short's views count a tenth as much. Otherwise the same: watched clips last, then
-- (views + 10) / (days old + 2)^1.3.
create or replace function public.reels_page(p_games text[], p_limit int default 15, p_offset int default 0, p_seen text[] default '{}')
returns setof public.reels
  language sql stable
  security invoker
  set search_path = ''
as $$
  select r.*
  from public.reels r
  where r.game = any (p_games)
    and r.created_at > now() - interval '30 days'
  order by r.clip_id = any (coalesce(p_seen, '{}')),
    (case when r.platform = 'youtube' then r.view_count / 10.0 else r.view_count end + 10)
      / power(extract(epoch from (now() - r.created_at)) / 86400.0 + 2, 1.3) desc,
    r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
