-- A birthday is needed to message or play-match anyone (round 692, Matthew's choice after the pre-open-source
-- security review).
--
-- Since 2026-11-13 the birthday is optional, and an account without one counts as a teen
-- (private.is_minor). That kept profiles and posts safe, but it also put birthday-less accounts in the
-- teen group for messages: an adult could skip the birthday and find, message, play-request or ladder-match
-- real teens. Now every way of contacting another player needs a birthday on file on both sides. Sign-up
-- stays birthday-free; the app explains "Add your birthday on your profile to message people".
--
-- Also: the online ladder now only pairs players in the same age group (it swaps connect codes, and checked
-- only blocks before).
--
-- Only functions change: no table, no data.

create function private.has_birthday(uid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.private_profile_data d where d.user_id = uid and d.date_of_birth is not null); $$;
revoke all on function private.has_birthday(uuid) from public;
grant execute on function private.has_birthday(uuid) to authenticated;

-- Sending: both people in a direct chat (and the sender in a group) need a birthday.
create or replace function private.can_send(conv uuid, uid uuid) returns boolean
  language plpgsql stable security definer set search_path = ''
as $$
declare c record; other uuid; other_status text;
begin
  select * into c from public.conversations where id = conv;
  if c is null or private.member_status(conv, uid) is distinct from 'active' then return false; end if;
  if not private.has_birthday(uid) then return false; end if;
  if private.age_band(uid) <> c.age_band then return false; end if;
  if c.kind = 'direct' then
    select m.user_id, m.status into other, other_status from public.conversation_members m where m.conversation_id = conv and m.user_id <> uid;
    if other is null or private.is_blocked(uid, other) then return false; end if;
    if not private.has_birthday(other) then return false; end if;
    if other_status = 'left' and not private.is_mutual(uid, other) then return false; end if;
    if other_status = 'request' and exists (select 1 from public.messages where conversation_id = conv and sender_id = uid) then return false; end if;
  end if;
  return true;
end;
$$;

create or replace function public.start_direct(other uuid) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare me uuid := auth.uid(); band text; k text; conv uuid;
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if other = me or not exists (select 1 from public.profiles where id = other) then raise exception 'That account isn''t available.' using errcode = 'P0001'; end if;
  if not private.has_birthday(me) then raise exception 'Add your birthday on your profile to message people.' using errcode = 'P0001'; end if;
  band := private.age_band(me);
  if private.age_band(other) <> band or not private.has_birthday(other) then raise exception 'You can''t message this account.' using errcode = 'P0001'; end if;
  if private.is_blocked(me, other) then raise exception 'You can''t message this account.' using errcode = 'P0001'; end if;
  k := least(me::text, other::text) || ':' || greatest(me::text, other::text);
  select id into conv from public.conversations where direct_key = k;
  if conv is null then
    perform private.rate_limit('start_chat', 20, interval '1 hour');
    insert into public.conversations (kind, age_band, direct_key, created_by) values ('direct', band, k, me) returning id into conv;
    insert into public.conversation_members (conversation_id, user_id, role, status) values
      (conv, me, 'member', 'active'),
      (conv, other, 'member', case when private.is_mutual(me, other) then 'active' else 'request' end);
  else
    -- Both people are in the same age group now (checked above): the chat follows them.
    update public.conversations set age_band = band where id = conv and age_band <> band;
    -- Reopening a chat you'd left; the other side's status stays as it was.
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'left';
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'request';
  end if;
  return conv;
end;
$$;

-- Groups (create_group and add_group_members both use this): the adder and everyone added need a birthday.
create or replace function private.check_addable(me uuid, band text, people uuid[]) returns void
  language plpgsql stable security definer set search_path = ''
as $$
declare p uuid;
begin
  if not private.has_birthday(me) then raise exception 'Add your birthday on your profile to message people.' using errcode = 'P0001'; end if;
  foreach p in array people loop
    if p = me then continue; end if;
    if not exists (select 1 from public.profiles where id = p) then raise exception 'One of those accounts isn''t available.' using errcode = 'P0001'; end if;
    if private.age_band(p) <> band or not private.has_birthday(p) or private.is_blocked(me, p) or not private.is_mutual(me, p) then
      raise exception 'You can only add people you follow each other with.' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

-- The people search in Messages: nobody without a birthday on either side.
create or replace function public.messageable_people(q text default '') returns table (id uuid, tag text, handle text, mutual boolean)
  language sql stable security definer set search_path = ''
as $$
  select p.id, p.tag, p.handle, private.is_mutual(auth.uid(), p.id) as mutual
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and private.has_birthday(auth.uid())
    and private.has_birthday(p.id)
    and private.age_band(p.id) = private.age_band(auth.uid())
    and not private.is_blocked(auth.uid(), p.id)
    and (
      (coalesce(btrim(q), '') = '' and private.is_mutual(auth.uid(), p.id))
      or (char_length(btrim(q)) >= 2 and (p.handle ilike btrim(q) || '%' or p.tag ilike '%' || btrim(q) || '%'))
    )
  order by private.is_mutual(auth.uid(), p.id) desc, p.tag
  limit 30;
$$;

create or replace function public.ask_to_play(p_to uuid, p_game text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  rid uuid;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'Finish joining first.' using errcode = '42501'; end if;
  if not private.has_birthday(uid) then raise exception 'Add your birthday on your profile to ask people to play.' using errcode = 'P0403'; end if;
  if not private.is_play_game(p_game) then raise exception 'Pick a game.' using errcode = '22023'; end if;
  if p_to = uid then raise exception 'That''s you.' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_to)
     or private.is_blocked(uid, p_to)
     or not private.has_birthday(p_to)
     or private.age_band(uid) <> private.age_band(p_to) then
    raise exception 'You can''t ask this player.' using errcode = 'P0403';
  end if;
  if exists (select 1 from public.play_requests where from_id = uid and to_id = p_to and status = 'pending' and expires_at > now()) then
    raise exception 'You already asked. Give them a few minutes.' using errcode = 'P0409';
  end if;
  if (select count(*) from public.play_requests where from_id = uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many requests. Try again later.' using errcode = 'P0429';
  end if;
  insert into public.play_requests (from_id, to_id, game) values (uid, p_to, p_game) returning id into rid;
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
    values (p_to, uid, 'play_request', p_game, '/play?room=' || p_game || '#requests');
  return rid;
end;
$$;

-- Online ladder: a birthday to queue, and opponents only from the same age group (it swaps connect codes).
create or replace function public.ladder_find_match(p_game text, p_connect text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); my_region text; my_rating integer; existing uuid; opp public.ladder_queue; mid uuid;
  v_season text := private.ladder_season(now());
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if p_game not in ('melee', 'ultimate', 'pplus') then raise exception 'Pick a game.' using errcode = 'P0001'; end if;
  if not private.has_birthday(uid) then raise exception 'Add your birthday on your profile to play on the ladder.' using errcode = 'P0001'; end if;
  select id into existing from public.ladder_matches
    where (p1 = uid or p2 = uid) and status in ('playing', 'reported', 'disputed') order by created_at desc limit 1;
  if existing is not null then return existing; end if;
  select region into my_region from public.profiles where id = uid;
  select coalesce((select rating from public.ladder_ratings r where r.season = v_season and r.game = p_game and r.user_id = uid), 1000) into my_rating;
  select q.* into opp from public.ladder_queue q
    left join public.ladder_ratings r on r.season = v_season and r.game = q.game and r.user_id = q.user_id
    where q.game = p_game and q.user_id <> uid and q.expires_at > now()
      and not exists (select 1 from public.blocks b where (b.blocker_id = uid and b.blocked_id = q.user_id) or (b.blocker_id = q.user_id and b.blocked_id = uid))
      and private.has_birthday(q.user_id)
      and private.age_band(q.user_id) = private.age_band(uid)
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
