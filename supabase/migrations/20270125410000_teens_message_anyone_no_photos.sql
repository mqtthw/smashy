-- Round 722: teens can message anyone; chats that include a teen carry no photos (Matthew, 2026-11-22).
--
-- Before: a teen could only message teens and an adult only adults (direct chats, groups, play
-- requests, the people search). Matthew's call: the worry is pictures, not talking. So the age split
-- goes, and in its place any chat with someone under 18 in it:
--   - takes no photos, from anyone in it (new);
--   - blocks phone numbers, emails, links and social handles, from anyone in it (was: teen chats);
-- and everything else stays: both sides need a birthday on file, a message from someone you don't
-- follow back arrives as a request (one message until accepted), blocks, reports, rate limits.
-- A chat's age_band now means "teen" = someone in it is under 18. It's set when the chat is made or
-- someone is added; the rules below check the members themselves, so a stale band can't weaken them.
--
-- Only functions change. Existing chats and messages are untouched (photos already sent in teen-only
-- chats stay). Every function here is "create or replace", so the file can be run again.

-- Is anyone in this chat (active or with a pending request) under 18?
create or replace function private.conversation_has_teen(conv uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.status in ('active', 'request') and private.is_minor(m.user_id)
  );
$$;
revoke all on function private.conversation_has_teen(uuid) from public;
grant execute on function private.conversation_has_teen(uuid) to authenticated;

-- For the app: can photos be sent in this chat? (Members only; anyone else gets false.)
create or replace function public.conversation_allows_photos(conv uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select coalesce(private.member_status(conv, auth.uid()) = 'active', false) and not private.conversation_has_teen(conv);
$$;
revoke all on function public.conversation_allows_photos(uuid) from public, anon;
grant execute on function public.conversation_allows_photos(uuid) to authenticated;

-- Every message: no photo and no contact info in a chat with a teen in it.
create or replace function private.before_message() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare teen boolean;
begin
  -- Photos are added by the server (after the safety check), into this conversation's folder.
  if new.image_path is not null and new.image_path not like new.conversation_id::text || '/' || new.sender_id::text || '/%' then
    raise exception 'That photo can''t be used here.' using errcode = 'P0001';
  end if;
  teen := private.conversation_has_teen(new.conversation_id)
    or (select age_band from public.conversations where id = new.conversation_id) = 'teen';
  if teen and new.image_path is not null then
    raise exception 'Photos can''t be sent in this chat.' using errcode = 'P0001';
  end if;
  if teen and private.has_contact_info(new.body) then
    raise exception 'Messages can''t include phone numbers, emails or social handles. Keep the chat on Smashy.' using errcode = 'P0001';
  end if;
  if auth.uid() is not null then
    perform private.rate_limit('message', 20, interval '1 minute');
    perform private.rate_limit('message_hour', 300, interval '1 hour');
  end if;
  return new;
end; $$;

-- Sending: as before, minus "your age group must match the chat's".
create or replace function private.can_send(conv uuid, uid uuid) returns boolean
  language plpgsql stable security definer set search_path = ''
as $$
declare c record; other uuid; other_status text;
begin
  select * into c from public.conversations where id = conv;
  if c is null or private.member_status(conv, uid) is distinct from 'active' then return false; end if;
  if not private.has_birthday(uid) then return false; end if;
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
  if not private.has_birthday(other) then raise exception 'You can''t message this account.' using errcode = 'P0001'; end if;
  if private.is_blocked(me, other) then raise exception 'You can''t message this account.' using errcode = 'P0001'; end if;
  band := case when private.is_minor(me) or private.is_minor(other) then 'teen' else 'adult' end;
  k := least(me::text, other::text) || ':' || greatest(me::text, other::text);
  select id into conv from public.conversations where direct_key = k;
  if conv is null then
    perform private.rate_limit('start_chat', 20, interval '1 hour');
    insert into public.conversations (kind, age_band, direct_key, created_by) values ('direct', band, k, me) returning id into conv;
    insert into public.conversation_members (conversation_id, user_id, role, status) values
      (conv, me, 'member', 'active'),
      (conv, other, 'member', case when private.is_mutual(me, other) then 'active' else 'request' end);
  else
    -- The chat follows the two people's ages (someone turned 18).
    update public.conversations set age_band = band where id = conv and age_band <> band;
    -- Reopening a chat you'd left; the other side's status stays as it was.
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'left';
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'request';
  end if;
  return conv;
end;
$$;

-- Groups: who can be added. Any age now; still only people you follow each other with, with a
-- birthday on file, and no block. (`band` is kept so the callers' signature doesn't change.)
create or replace function private.check_addable(me uuid, band text, people uuid[]) returns void
  language plpgsql stable security definer set search_path = ''
as $$
declare p uuid;
begin
  if not private.has_birthday(me) then raise exception 'Add your birthday on your profile to message people.' using errcode = 'P0001'; end if;
  foreach p in array people loop
    if p = me then continue; end if;
    if not exists (select 1 from public.profiles where id = p) then raise exception 'One of those accounts isn''t available.' using errcode = 'P0001'; end if;
    if not private.has_birthday(p) or private.is_blocked(me, p) or not private.is_mutual(me, p) then
      raise exception 'You can only add people you follow each other with.' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create or replace function public.create_group(title text, people uuid[]) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); band text; conv uuid; p uuid; others uuid[];
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  others := array(select distinct x from unnest(people) x where x <> me);
  if coalesce(array_length(others, 1), 0) < 2 then raise exception 'Pick at least two people for a group.' using errcode = 'P0001'; end if;
  if array_length(others, 1) > 19 then raise exception 'Groups can have up to 20 people.' using errcode = 'P0001'; end if;
  -- A group with anyone under 18 in it is a teen chat (its name follows the teen rules too).
  band := case when private.is_minor(me) or exists (select 1 from unnest(others) x where private.is_minor(x)) then 'teen' else 'adult' end;
  perform private.check_group_title(band, title);
  perform private.check_addable(me, band, others);
  perform private.rate_limit('start_chat', 20, interval '1 hour');
  insert into public.conversations (kind, title, age_band, created_by) values ('group', btrim(title), band, me) returning id into conv;
  insert into public.conversation_members (conversation_id, user_id, role) values (conv, me, 'owner');
  foreach p in array others loop
    insert into public.conversation_members (conversation_id, user_id) values (conv, p);
  end loop;
  return conv;
end;
$$;

create or replace function public.add_group_members(conv uuid, people uuid[]) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); c record; p uuid; others uuid[];
begin
  select * into c from public.conversations where id = conv;
  if c is null or c.kind <> 'group' or private.member_status(conv, me) is distinct from 'active' then
    raise exception 'You can''t add people to this chat.' using errcode = 'P0001';
  end if;
  others := array(select distinct x from unnest(people) x where x <> me);
  if (select count(*) from public.conversation_members where conversation_id = conv and status = 'active')
     + coalesce(array_length(others, 1), 0) > 20 then
    raise exception 'Groups can have up to 20 people.' using errcode = 'P0001';
  end if;
  perform private.check_addable(me, c.age_band, others);
  foreach p in array others loop
    insert into public.conversation_members (conversation_id, user_id) values (conv, p)
      on conflict (conversation_id, user_id) do update set status = 'active', joined_at = now();
  end loop;
  -- Someone under 18 joined an adults' group: it's a teen chat from here on.
  if c.age_band <> 'teen' and private.conversation_has_teen(conv) then
    update public.conversations set age_band = 'teen' where id = conv;
  end if;
end;
$$;

-- The people search in Messages: any age (still: a birthday on both sides, no block).
create or replace function public.messageable_people(q text default '') returns table (id uuid, tag text, handle text, mutual boolean)
  language sql stable security definer set search_path = ''
as $$
  select p.id, p.tag, p.handle, private.is_mutual(auth.uid(), p.id) as mutual
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and private.has_birthday(auth.uid())
    and private.has_birthday(p.id)
    and not private.is_blocked(auth.uid(), p.id)
    and (
      (coalesce(btrim(q), '') = '' and private.is_mutual(auth.uid(), p.id))
      or (char_length(btrim(q)) >= 2 and (p.handle ilike btrim(q) || '%' or p.tag ilike '%' || btrim(q) || '%'))
    )
  order by private.is_mutual(auth.uid(), p.id) desc, p.tag
  limit 30;
$$;

-- "Friends" on Play (people you follow each other with): any age.
create or replace function public.play_friends()
  returns table (id uuid, tag text, handle text, avatar_path text, looking_game text, looking_until timestamptz)
  language sql stable security definer set search_path = ''
as $$
  select p.id, p.tag, p.handle, p.avatar_path,
    case when s.looking_until > now() then s.looking_game end,
    case when s.looking_until > now() then s.looking_until end
  from public.follows a
  join public.follows b on b.follower_id = a.followee_id and b.followee_id = a.follower_id and b.status = 'active'
  join public.profiles p on p.id = a.followee_id
  left join public.play_settings s on s.user_id = p.id
  where a.follower_id = (select auth.uid()) and a.status = 'active'
    and not private.is_blocked(a.follower_id, p.id)
  order by (s.looking_until > now()) is true desc, p.tag
  limit 100;
$$;

-- Asking someone to play: any age (still: a birthday on both sides, no block, 10 an hour).
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
     or not private.has_birthday(p_to) then
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
