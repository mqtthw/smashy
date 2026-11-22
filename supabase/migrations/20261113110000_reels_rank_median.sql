-- Reels ranking: compare each clip with the median clip on its platform (not the average), so a few
-- huge YouTube Shorts don't make every other Short look unpopular next to Twitch clips.
create or replace function public.reels_page(p_games text[], p_limit int default 15, p_offset int default 0, p_seen text[] default '{}')
returns setof public.reels
  language sql stable
  security invoker
  set search_path = ''
as $$
  with typical as (
    select platform, greatest(percentile_cont(0.5) within group (order by view_count), 1)::float8 as views
    from public.reels
    where game = any (p_games) and not low_quality and coalesce(submitted_at, created_at) > now() - interval '30 days'
    group by platform
  )
  select r.*
  from public.reels r
  join typical t on t.platform = r.platform
  where r.game = any (p_games)
    and not r.low_quality
    and coalesce(r.submitted_at, r.created_at) > now() - interval '30 days'
  order by r.clip_id = any (coalesce(p_seen, '{}')),
    (r.view_count / t.views + r.like_count * 0.5 + 0.2)
      / power(extract(epoch from (now() - coalesce(r.submitted_at, r.created_at))) / 86400.0 + 2, 1.3) desc,
    r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
