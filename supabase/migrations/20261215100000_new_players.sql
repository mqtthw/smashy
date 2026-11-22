-- New players corner.
--
-- 1. A "New player" tag (flair) for Discuss threads: beginners' questions, gathered on each game's
--    /new page so experienced players can find and answer them. The list of allowed flairs gains
--    'newplayer'; nothing else about posts changes.
-- 2. The ladder pairs people with the closest rating first (in bands of 100 points), then someone in
--    the same region, then whoever has waited longest, so beginners meet beginners when several
--    people are waiting. Only the order of who is picked changes; everything else in
--    ladder_find_match is as it was (20261213100000_online_ladder.sql).
--
-- Nothing here changes or deletes existing rows.

alter table public.posts drop constraint posts_flair_check;
alter table public.posts add constraint posts_flair_check
  check (flair is null or flair in ('question', 'discussion', 'analysis', 'news', 'meme', 'art', 'help', 'newplayer'));

create or replace function public.ladder_find_match(p_game text, p_connect text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); my_region text; my_rating integer; existing uuid; opp public.ladder_queue; mid uuid;
  v_season text := private.ladder_season(now());
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if p_game not in ('melee', 'ultimate', 'pplus') then raise exception 'Pick a game.' using errcode = 'P0001'; end if;
  select id into existing from public.ladder_matches
    where (p1 = uid or p2 = uid) and status in ('playing', 'reported', 'disputed') order by created_at desc limit 1;
  if existing is not null then return existing; end if;
  select region into my_region from public.profiles where id = uid;
  select coalesce((select rating from public.ladder_ratings r where r.season = v_season and r.game = p_game and r.user_id = uid), 1000) into my_rating;
  select q.* into opp from public.ladder_queue q
    left join public.ladder_ratings r on r.season = v_season and r.game = q.game and r.user_id = q.user_id
    where q.game = p_game and q.user_id <> uid and q.expires_at > now()
      and not exists (select 1 from public.blocks b where (b.blocker_id = uid and b.blocked_id = q.user_id) or (b.blocker_id = q.user_id and b.blocked_id = uid))
    order by abs(coalesce(r.rating, 1000) - my_rating) / 100, (q.region is not distinct from my_region) desc, q.joined_at
    limit 1 for update of q skip locked;
  if opp.user_id is null then
    insert into public.ladder_queue (user_id, game, region, connect_info) values (uid, p_game, my_region, p_connect)
      on conflict (user_id) do update set game = excluded.game, region = excluded.region, connect_info = excluded.connect_info,
        joined_at = now(), expires_at = now() + interval '30 minutes';
    return null;
  end if;
  delete from public.ladder_queue where user_id in (uid, opp.user_id);
  insert into public.ladder_matches (game, season, p1, p2, p1_connect, p2_connect)
    values (p_game, v_season, opp.user_id, uid, opp.connect_info, p_connect)
    returning id into mid;
  perform private.ladder_alert(opp.user_id, uid, mid, 'Your ladder match is ready');
  return mid;
end;
$$;
-- (create or replace keeps the function's existing permissions: members only.)
