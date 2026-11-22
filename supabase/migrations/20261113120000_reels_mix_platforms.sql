-- Reels ranking: rank Twitch clips and YouTube Shorts separately (views vs. the median clip on that
-- platform, plus likes, fading with age), then mix them: about one Short for every two Twitch clips
-- while there are Shorts left. Watched clips still go last; junk is still left out.
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
  ),
  scored as (
    select r.*,
      (r.clip_id = any (coalesce(p_seen, '{}'))) as seen,
      (r.view_count / t.views + r.like_count * 0.5 + 0.2)
        / power(extract(epoch from (now() - coalesce(r.submitted_at, r.created_at))) / 86400.0 + 2, 1.3) as score
    from public.reels r
    join typical t on t.platform = r.platform
    where r.game = any (p_games)
      and not r.low_quality
      and coalesce(r.submitted_at, r.created_at) > now() - interval '30 days'
  ),
  placed as (
    select s.*,
      row_number() over (partition by s.seen, s.platform order by s.score desc, s.clip_id)
        * case when s.platform = 'youtube' then 2.0 else 1.0 end as slot
    from scored s
  )
  select (p.*)::public.reels
  from (select clip_id, seen, slot, score from placed) o
  join public.reels p on p.clip_id = o.clip_id
  order by o.seen, o.slot, o.score desc, o.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
