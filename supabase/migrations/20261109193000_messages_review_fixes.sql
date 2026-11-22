-- Review fixes for messages.

-- 1) Deleting (hiding) a direct chat blocked messaging forever. Now: if you follow each other, a new
--    message brings the chat back for the other person. If you don't (they declined your request),
--    it stays closed.
create or replace function private.can_send(conv uuid, uid uuid) returns boolean
  language plpgsql stable security definer set search_path = ''
as $$
declare c record; other uuid; other_status text;
begin
  select * into c from public.conversations where id = conv;
  if c is null or private.member_status(conv, uid) is distinct from 'active' then return false; end if;
  if private.age_band(uid) <> c.age_band then return false; end if;
  if c.kind = 'direct' then
    select m.user_id, m.status into other, other_status from public.conversation_members m where m.conversation_id = conv and m.user_id <> uid;
    if other is null or private.is_blocked(uid, other) then return false; end if;
    if other_status = 'left' and not private.is_mutual(uid, other) then return false; end if;
    if other_status = 'request' and exists (select 1 from public.messages where conversation_id = conv and sender_id = uid) then return false; end if;
  end if;
  return true;
end;
$$;

create or replace function private.after_message() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at where conversation_id = new.conversation_id and user_id = new.sender_id;
  -- A direct chat the other person had deleted comes back for them (only possible between mutuals).
  update public.conversation_members m set status = 'active'
    from public.conversations c
    where c.id = new.conversation_id and c.kind = 'direct' and m.conversation_id = c.id and m.user_id <> new.sender_id and m.status = 'left';
  return new;
end; $$;

-- 3) Teen group names get the same contact-info filter as teen messages.
create or replace function private.check_group_title(band text, t text) returns void
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if t is null or char_length(btrim(t)) not between 1 and 60 then raise exception 'Give the group a name (up to 60 characters).' using errcode = 'P0001'; end if;
  if band = 'teen' and private.has_contact_info(t) then
    raise exception 'Group names can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
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
  band := private.age_band(me);
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

create or replace function public.rename_group(conv uuid, new_title text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare band text;
begin
  if private.member_status(conv, auth.uid()) is distinct from 'active' then raise exception 'You can''t rename this chat.' using errcode = 'P0001'; end if;
  select age_band into band from public.conversations where id = conv;
  perform private.check_group_title(band, new_title);
  update public.conversations set title = btrim(new_title) where id = conv and kind = 'group';
end;
$$;

-- 4) Message photos cost a safety check each: their own limit (checked before the photo is processed).
create function public.limit_message_photo() returns void
  language plpgsql security definer set search_path = ''
as $$ begin perform private.rate_limit('message_photo', 30, interval '1 hour'); end; $$;
revoke all on function public.limit_message_photo() from public, anon;
grant execute on function public.limit_message_photo() to authenticated;

-- 6) Tapping Message makes a chat before anything is sent. Empty direct chats stay out of everyone's
--    inbox, and are cleaned up after a day.
create or replace function public.my_conversations() returns table (
  id uuid, kind text, title text, status text, last_message_at timestamptz,
  last_body text, last_sender uuid, last_has_image boolean, last_deleted boolean, unread int, members jsonb, can_send boolean
)
  language sql stable security invoker set search_path = ''
as $$
  select c.id, c.kind, c.title, me.status, c.last_message_at,
    lm.body, lm.sender_id, lm.image_path is not null, lm.deleted_at is not null,
    (select count(*)::int from public.messages m where m.conversation_id = c.id and m.created_at > me.last_read_at and m.sender_id is distinct from me.user_id and m.deleted_at is null),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'tag', p.tag, 'handle', p.handle) order by p.tag)
      from public.conversation_members om join public.profiles p on p.id = om.user_id
      where om.conversation_id = c.id and om.user_id <> me.user_id and om.status <> 'left'
    ), '[]'::jsonb),
    private.can_send(c.id, me.user_id)
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select m.body, m.sender_id, m.image_path, m.deleted_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where me.user_id = auth.uid() and me.status in ('active', 'request')
    and (c.kind = 'group' or lm.sender_id is not null or lm.deleted_at is not null)
  order by c.last_message_at desc
  limit 100;
$$;

create or replace function public.empty_conversations() returns setof uuid
  language sql stable security definer set search_path = ''
as $$
  select c.id from public.conversations c
  where not exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.status <> 'left')
     or (c.kind = 'direct' and c.created_at < now() - interval '1 day' and not exists (select 1 from public.messages m where m.conversation_id = c.id))
  limit 200;
$$;

-- 10) Nothing listens to member changes live.
alter publication supabase_realtime drop table public.conversation_members;
