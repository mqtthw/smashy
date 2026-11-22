-- Reels ranking: a fairer mix of Twitch clips and YouTube Shorts.
-- Real numbers: Twitch clips here get ~8 views (a few hundred at most); Shorts get thousands to
-- 100k+. Counting Shorts' views at a tenth still let them take over. Now each clip is compared with
-- clips from the same site: its views divided by that site's average. A clip twice as popular as
-- usual for Twitch ranks like a Short twice as popular as usual for YouTube. Then, as before:
-- newer first ((days old + 2)^1.3), and clips this device already watched go last.
create or replace function public.reels_page(p_games text[], p_limit int default 15, p_offset int default 0, p_seen text[] default '{}')
returns setof public.reels
  language sql stable
  security invoker
  set search_path = ''
as $$
  with recent as (
    select r.*
    from public.reels r
    where r.game = any (p_games)
      and r.created_at > now() - interval '30 days'
  ),
  typical as (
    select platform, greatest(avg(view_count), 1)::float8 as views
    from recent
    group by platform
  )
  select r.clip_id, r.channel_login, r.channel_name, r.title, r.game, r.view_count, r.duration, r.thumbnail_url,
    r.video_id, r.vod_offset, r.created_at, r.hidden, r.fetched_at, r.title_flagged, r.platform
  from recent r
  join typical t on t.platform = r.platform
  order by r.clip_id = any (coalesce(p_seen, '{}')),
    (r.view_count / t.views + 0.2) / power(extract(epoch from (now() - r.created_at)) / 86400.0 + 2, 1.3) desc,
    r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
