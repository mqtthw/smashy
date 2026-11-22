-- Reels favor new clips, with proven ones mixed in (round 419).
--
-- Before: score = (views / the platform's usual views + likes / 2 + 0.2) / (age in days + 2)^1.3.
-- A clip with 50 times the usual views kept the top spots for weeks, so Reels looked the same.
--
-- Now two lanes are merged:
--   * new: views softened with a square root, and a steeper age penalty, (age in days + 1)^1.5,
--     so clips from the last day or two lead (still one YouTube clip per two Twitch ones, as before);
--   * proven: the most-watched clips of the last 30 days take about every fourth spot, so there's
--     always something good even when the newest clips are small.
-- A clip that ranks well in both lanes appears once, at its better spot. Clips this device already
-- watched still go to the back. Same inputs and output as before, so the site needs no change.

create or replace function public.reels_page(p_games text[], p_limit integer default 15, p_offset integer default 0, p_seen text[] default '{}'::text[])
returns setof public.reels
language sql
stable
set search_path to ''
as $function$
  with typical as (
    select platform, greatest(percentile_cont(0.5) within group (order by view_count), 1)::float8 as views
    from public.reels
    where game = any (p_games) and not low_quality and coalesce(submitted_at, created_at) > now() - interval '30 days'
    group by platform
  ),
  scored as (
    select r.clip_id,
      (r.clip_id = any (coalesce(p_seen, '{}'))) as seen,
      r.platform,
      (sqrt(r.view_count / t.views) + r.like_count * 0.5 + 0.2)
        / power(extract(epoch from (now() - coalesce(r.submitted_at, r.created_at))) / 86400.0 + 1, 1.5) as fresh,
      (r.view_count / t.views + r.like_count * 0.5) as proven
    from public.reels r
    join typical t on t.platform = r.platform
    where r.game = any (p_games)
      and not r.low_quality
      and coalesce(r.submitted_at, r.created_at) > now() - interval '30 days'
  ),
  placed as (
    select s.clip_id, s.seen, s.fresh,
      least(
        row_number() over (partition by s.seen, s.platform order by s.fresh desc, s.clip_id)
          * case when s.platform = 'youtube' then 2.0 else 1.0 end,
        row_number() over (partition by s.seen order by s.proven desc, s.clip_id) * 4.0 - 0.5
      ) as slot
    from scored s
  )
  select (p.*)::public.reels
  from placed o
  join public.reels p on p.clip_id = o.clip_id
  order by o.seen, o.slot, o.fresh desc, o.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$function$;
