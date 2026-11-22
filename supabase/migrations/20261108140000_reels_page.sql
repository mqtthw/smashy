-- Review fix: Reels loaded and ranked 400 clips (with a comment count each) on every scroll batch.
-- Now the database ranks them and returns one page. Popular and recent first:
--   (views + 10) / (days old + 2)^1.3
-- Runs as the viewer, so hidden clips and unapproved/blocked channels stay out.
create or replace function public.reels_page(p_games text[], p_limit int default 15, p_offset int default 0)
returns setof public.reels
  language sql stable
  security invoker
  set search_path = ''
as $$
  select r.*
  from public.reels r
  where r.game = any (p_games)
    and r.created_at > now() - interval '30 days'
  order by (r.view_count + 10) / power(extract(epoch from (now() - r.created_at)) / 86400.0 + 2, 1.3) desc, r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
grant execute on function public.reels_page(text[], int, int) to anon, authenticated;
