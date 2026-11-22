-- Direct messages and group chats.
--
-- Safety rules (decided with Matthew, 2026-11-07), enforced here in the database:
--   * Teens (13-17) and adults (18+) are kept apart: every conversation has an age band fixed when
--     it starts, and only people in that band can join or send. Someone who turns 18 can still read
--     their teen chats but can't send in them. (Ages come from the birthdate given at sign-up; real
--     age verification is a known gap to close before launch.)
--   * People who follow each other can message directly. Anyone else (same band) lands in the
--     other person's Message requests and can send just one message until it's accepted.
--   * Blocking stops all contact both ways: no messages, no new chats or groups together, no follows.
--   * Group chats: up to 20 people; you can only add people you follow each other with.
--   * Teen chats block contact info (phone numbers, emails, social handles), like everywhere else
--     teens post. Slow-down limits on sending.
--   * Photos are stored privately (never public links) after the same automatic safety check as
--     post photos; the server adds them.

-- ---------- Blocks ----------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;
create policy "People see their own blocks" on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "People block for themselves" on public.blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "People unblock for themselves" on public.blocks for delete to authenticated using (blocker_id = (select auth.uid()));

create function private.is_blocked(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- Blocking someone also ends follows both ways, and blocked people can't follow.
create function private.after_block() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows where (follower_id = new.blocker_id and followee_id = new.blocked_id)
                                or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end; $$;
create trigger blocks_after_insert after insert on public.blocks for each row execute function private.after_block();

create function private.before_follow_blocked() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_blocked(new.follower_id, new.followee_id) then
    raise exception 'You can''t follow this account.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger follows_blocked before insert on public.follows for each row execute function private.before_follow_blocked();

create function private.is_mutual(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.follows where follower_id = a and followee_id = b and status = 'active')
     and exists (select 1 from public.follows where follower_id = b and followee_id = a and status = 'active');
$$;

create function private.age_band(uid uuid) returns text
  language sql stable security definer set search_path = ''
as $$ select case when private.is_minor(uid) then 'teen' else 'adult' end; $$;

-- ---------- Conversations ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  title text check (title is null or char_length(btrim(title)) between 1 and 60),
  age_band text not null check (age_band in ('teen', 'adult')),
  direct_key text unique,                -- "smaller-id:bigger-id" for direct chats, so there's one per pair
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'request', 'left')),
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id, status);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  image_path text,                       -- in the private "message-images" bucket
  image_width int,
  image_height int,
  deleted_at timestamptz,                -- unsent by the sender or removed by moderators
  created_at timestamptz not null default now(),
  check (deleted_at is not null or char_length(btrim(body)) > 0 or image_path is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);

-- Your status in a conversation ('active', 'request', 'left', or null).
create function private.member_status(conv uuid, uid uuid) returns text
  language sql stable security definer set search_path = ''
as $$ select status from public.conversation_members where conversation_id = conv and user_id = uid; $$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations, public.conversation_members, public.messages from anon, authenticated;
grant select on public.conversations, public.conversation_members, public.messages to authenticated;
grant insert (conversation_id, sender_id, body, image_path, image_width, image_height) on public.messages to authenticated;

create policy "Members see their conversations" on public.conversations for select to authenticated
  using (private.member_status(id, (select auth.uid())) in ('active', 'request'));
create policy "Members see who's in their conversations" on public.conversation_members for select to authenticated
  using (private.member_status(conversation_id, (select auth.uid())) in ('active', 'request'));
create policy "Members read messages" on public.messages for select to authenticated
  using (private.member_status(conversation_id, (select auth.uid())) in ('active', 'request'));

-- Can `uid` send in `conv` right now? (Shared by the insert rule and the app.)
create function private.can_send(conv uuid, uid uuid) returns boolean
  language plpgsql stable security definer set search_path = ''
as $$
declare c record; other uuid; other_status text;
begin
  select * into c from public.conversations where id = conv;
  if c is null or private.member_status(conv, uid) is distinct from 'active' then return false; end if;
  if private.age_band(uid) <> c.age_band then return false; end if;
  if c.kind = 'direct' then
    select m.user_id, m.status into other, other_status from public.conversation_members m where m.conversation_id = conv and m.user_id <> uid;
    if other is null or other_status = 'left' or private.is_blocked(uid, other) then return false; end if;
    -- Not accepted yet: one message, then wait.
    if other_status = 'request' and exists (select 1 from public.messages where conversation_id = conv and sender_id = uid) then return false; end if;
  end if;
  return true;
end;
$$;

create policy "Members send messages" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.can_send(conversation_id, sender_id));

create function private.before_message() returns trigger language plpgsql security definer set search_path = '' as $$
declare band text;
begin
  -- Photos are added by the server (after the safety check), into this conversation's folder.
  if new.image_path is not null and new.image_path not like new.conversation_id::text || '/' || new.sender_id::text || '/%' then
    raise exception 'That photo can''t be used here.' using errcode = 'P0001';
  end if;
  select age_band into band from public.conversations where id = new.conversation_id;
  if band = 'teen' and private.has_contact_info(new.body) then
    raise exception 'Messages can''t include phone numbers, emails or social handles. Keep the chat on Smashy.' using errcode = 'P0001';
  end if;
  if auth.uid() is not null then
    perform private.rate_limit('message', 20, interval '1 minute');
    perform private.rate_limit('message_hour', 300, interval '1 hour');
  end if;
  return new;
end; $$;
create trigger messages_before_insert before insert on public.messages for each row execute function private.before_message();

create function private.after_message() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end; $$;
create trigger messages_after_insert after insert on public.messages for each row execute function private.after_message();

-- ---------- Starting and managing conversations (called by signed-in people) ----------

-- Opens (or finds) the direct chat with `other`. Returns its id.
create function public.start_direct(other uuid) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); band text; k text; conv uuid;
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if other = me or not exists (select 1 from public.profiles where id = other) then raise exception 'That account isn''t available.' using errcode = 'P0001'; end if;
  band := private.age_band(me);
  if private.age_band(other) <> band then raise exception 'You can''t message this account.' using errcode = 'P0001'; end if;
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
    -- Reopening a chat you'd left; the other side's status stays as it was.
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'left';
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'request';
  end if;
  return conv;
end;
$$;

-- Checks a list of people can be added by `me` to a chat in `band`. Raises with a reason if not.
create function private.check_addable(me uuid, band text, people uuid[]) returns void
  language plpgsql stable security definer set search_path = ''
as $$
declare p uuid;
begin
  foreach p in array people loop
    if p = me then continue; end if;
    if not exists (select 1 from public.profiles where id = p) then raise exception 'One of those accounts isn''t available.' using errcode = 'P0001'; end if;
    if private.age_band(p) <> band or private.is_blocked(me, p) or not private.is_mutual(me, p) then
      raise exception 'You can only add people you follow each other with.' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create function public.create_group(title text, people uuid[]) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); band text; conv uuid; p uuid; others uuid[];
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  others := array(select distinct x from unnest(people) x where x <> me);
  if coalesce(array_length(others, 1), 0) < 2 then raise exception 'Pick at least two people for a group.' using errcode = 'P0001'; end if;
  if array_length(others, 1) > 19 then raise exception 'Groups can have up to 20 people.' using errcode = 'P0001'; end if;
  if title is null or char_length(btrim(title)) not between 1 and 60 then raise exception 'Give the group a name (up to 60 characters).' using errcode = 'P0001'; end if;
  band := private.age_band(me);
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

create function public.add_group_members(conv uuid, people uuid[]) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); c record; p uuid; others uuid[];
begin
  select * into c from public.conversations where id = conv;
  if c is null or c.kind <> 'group' or private.member_status(conv, me) is distinct from 'active' or private.age_band(me) <> c.age_band then
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
end;
$$;

create function public.remove_group_member(conv uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.conversation_members where conversation_id = conv and user_id = auth.uid() and role = 'owner' and status = 'active') then
    raise exception 'Only the group''s creator can remove people.' using errcode = 'P0001';
  end if;
  update public.conversation_members set status = 'left' where conversation_id = conv and user_id = person and role <> 'owner';
end;
$$;

create function public.rename_group(conv uuid, new_title text) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if private.member_status(conv, auth.uid()) is distinct from 'active' then raise exception 'You can''t rename this chat.' using errcode = 'P0001'; end if;
  if new_title is null or char_length(btrim(new_title)) not between 1 and 60 then raise exception 'Names can be 1 to 60 characters.' using errcode = 'P0001'; end if;
  update public.conversations set title = btrim(new_title) where id = conv and kind = 'group';
end;
$$;

-- Leave a group, or hide a direct chat (it comes back if you start it again).
create function public.leave_conversation(conv uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare next_owner uuid;
begin
  update public.conversation_members set status = 'left' where conversation_id = conv and user_id = auth.uid();
  -- A group whose creator left gets a new one (the longest-standing member).
  if exists (select 1 from public.conversation_members where conversation_id = conv and user_id = auth.uid() and role = 'owner') then
    update public.conversation_members set role = 'member' where conversation_id = conv and user_id = auth.uid();
    select user_id into next_owner from public.conversation_members where conversation_id = conv and status = 'active' order by joined_at limit 1;
    if next_owner is not null then update public.conversation_members set role = 'owner' where conversation_id = conv and user_id = next_owner; end if;
  end if;
end;
$$;

create function public.accept_message_request(conv uuid) returns void
  language sql security definer set search_path = ''
as $$ update public.conversation_members set status = 'active' where conversation_id = conv and user_id = auth.uid() and status = 'request'; $$;

create function public.mark_conversation_read(conv uuid) returns void
  language sql security definer set search_path = ''
as $$ update public.conversation_members set last_read_at = now() where conversation_id = conv and user_id = auth.uid(); $$;

-- ---------- Inbox ----------
-- Your conversations, newest first: the other people, the last message, and how many are unread.
create function public.my_conversations() returns table (
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
    and (me.status = 'active' or exists (select 1 from public.messages m where m.conversation_id = c.id))  -- empty requests stay out of sight
  order by c.last_message_at desc
  limit 100;
$$;

-- For the nav badge: chats with unread messages, plus waiting requests.
create function public.unread_conversations() returns int
  language sql stable security invoker set search_path = ''
as $$
  select count(*)::int from public.conversation_members me
  where me.user_id = auth.uid() and me.status in ('active', 'request')
    and exists (select 1 from public.messages m where m.conversation_id = me.conversation_id and m.created_at > me.last_read_at
                and m.sender_id is distinct from me.user_id and m.deleted_at is null);
$$;

revoke all on function public.start_direct(uuid), public.create_group(text, uuid[]), public.add_group_members(uuid, uuid[]),
  public.remove_group_member(uuid, uuid), public.rename_group(uuid, text), public.leave_conversation(uuid),
  public.accept_message_request(uuid), public.mark_conversation_read(uuid), public.my_conversations(), public.unread_conversations() from public, anon;
grant execute on function public.start_direct(uuid), public.create_group(text, uuid[]), public.add_group_members(uuid, uuid[]),
  public.remove_group_member(uuid, uuid), public.rename_group(uuid, text), public.leave_conversation(uuid),
  public.accept_message_request(uuid), public.mark_conversation_read(uuid), public.my_conversations(), public.unread_conversations() to authenticated;
grant execute on function private.member_status(uuid, uuid), private.can_send(uuid, uuid), private.is_blocked(uuid, uuid),
  private.is_mutual(uuid, uuid), private.age_band(uuid) to authenticated;

-- Live delivery (Realtime follows the read rules above).
alter publication supabase_realtime add table public.messages, public.conversation_members;

-- ---------- Photos (private bucket; the server signs short-lived links for members) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-images', 'message-images', false, 2097152, array['image/webp'])
on conflict (id) do nothing;

-- ---------- Moderation ----------
alter table public.live_reports drop constraint live_reports_kind_check;
alter table public.live_reports add constraint live_reports_kind_check check (kind in ('chat', 'lobby', 'highlight', 'reel', 'message'));
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove_post', 'restore_post', 'dismiss_reports', 'remove_chat', 'close_lobby', 'dismiss_live', 'remove_highlight', 'hide_reel', 'remove_message'));
