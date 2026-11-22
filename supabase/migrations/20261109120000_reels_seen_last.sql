-- Reels: clips this device has already watched go to the back of the line, so each visit opens on
-- something new. The browser remembers which clips were watched (nothing is stored here) and sends
-- their ids as p_seen. Same ranking otherwise: (views + 10) / (days old + 2)^1.3.
drop function if exists public.reels_page(text[], int, int);
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
    (r.view_count + 10) / power(extract(epoch from (now() - r.created_at)) / 86400.0 + 2, 1.3) desc, r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
grant execute on function public.reels_page(text[], int, int, text[]) to anon, authenticated;
