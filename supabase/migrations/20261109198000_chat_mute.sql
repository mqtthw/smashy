-- Mute a chat: it stops counting toward your unread badge (it still shows unread in the inbox).
alter table public.conversation_members add column muted boolean not null default false;

create function public.set_conversation_muted(conv uuid, mute boolean) returns void
  language sql security definer set search_path = ''
as $$ update public.conversation_members set muted = mute where conversation_id = conv and user_id = auth.uid(); $$;
revoke all on function public.set_conversation_muted(uuid, boolean) from public, anon;
grant execute on function public.set_conversation_muted(uuid, boolean) to authenticated;

create or replace function public.unread_conversations() returns int
  language sql stable security invoker set search_path = ''
as $$
  select count(*)::int from public.conversation_members me
  where me.user_id = auth.uid() and me.status in ('active', 'request') and not me.muted
    and exists (select 1 from public.messages m where m.conversation_id = me.conversation_id and m.created_at > me.last_read_at
                and m.sender_id is distinct from me.user_id and m.deleted_at is null);
$$;

-- The inbox also says which chats you muted.
drop function public.my_conversations();
create function public.my_conversations() returns table (
  id uuid, kind text, title text, status text, last_message_at timestamptz,
  last_body text, last_sender uuid, last_has_image boolean, last_deleted boolean, unread int, members jsonb, can_send boolean, muted boolean
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
    private.can_send(c.id, me.user_id),
    me.muted
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
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
