-- Round 3 features. Additive only (new columns and tables), so the live site keeps working unchanged
-- until the new code is merged.

-- Character mains on profiles: up to 3, as [{ "game": "melee", "character": "fox" }, ...].
alter table public.profiles add column mains jsonb not null default '[]'::jsonb
  check (jsonb_typeof(mains) = 'array' and jsonb_array_length(mains) <= 3);
grant update (mains) on public.profiles to authenticated;

-- Notification settings: types you don't want to be notified about.
alter table public.profiles add column notification_mutes text[] not null default '{}'
  check (notification_mutes <@ array['like', 'reaction', 'repost', 'quote', 'follow', 'mention', 'reply', 'vote']::text[]);
grant update (notification_mutes) on public.profiles to authenticated;

-- Reply to a specific message in a chat.
alter table public.messages add column reply_to_id uuid references public.messages (id) on delete set null;
grant insert (reply_to_id) on public.messages to authenticated;
create function private.check_message_reply() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.reply_to_id is not null and not exists (select 1 from public.messages where id = new.reply_to_id and conversation_id = new.conversation_id) then
    raise exception 'You can only reply to a message in the same chat.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger messages_check_reply before insert on public.messages for each row execute function private.check_message_reply();

-- Quick reactions on messages (a small fixed set).
create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🔥', '😮', '🎮')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;
revoke all on public.message_reactions from anon, authenticated;
grant select, insert, delete on public.message_reactions to authenticated;
create function private.message_conversation(msg uuid) returns uuid
  language sql stable security definer set search_path = ''
as $$ select conversation_id from public.messages where id = msg; $$;
grant execute on function private.message_conversation(uuid) to authenticated;
create policy "Chat members see reactions" on public.message_reactions for select to authenticated
  using (private.member_status(private.message_conversation(message_id), (select auth.uid())) in ('active', 'request'));
create policy "Chat members react as themselves" on public.message_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_send(private.message_conversation(message_id), (select auth.uid())));
create policy "People remove their own reactions" on public.message_reactions for delete to authenticated
  using (user_id = (select auth.uid()));
create function private.limit_message_reactions() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.rate_limit('message_reaction', 60, interval '5 minutes'); return new; end; $$;
create trigger message_reactions_rate before insert on public.message_reactions for each row execute function private.limit_message_reactions();
alter publication supabase_realtime add table public.message_reactions;

-- Inbox: include each person's profile picture (same columns as before; the members list just gains
-- "avatar_path").
create or replace function public.my_conversations() returns table (
  id uuid, kind text, title text, status text, last_message_at timestamptz,
  last_body text, last_sender uuid, last_has_image boolean, last_deleted boolean, unread int, members jsonb, can_send boolean, muted boolean
)
  language sql stable security invoker set search_path = ''
as $$
  select c.id, c.kind, c.title, me.status, c.last_message_at,
    lm.body, lm.sender_id, lm.image_path is not null, lm.deleted_at is not null,
    (select count(*)::int from public.messages m where m.conversation_id = c.id and m.created_at > me.last_read_at and m.sender_id is distinct from me.user_id and m.deleted_at is null),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'tag', p.tag, 'handle', p.handle, 'avatar_path', p.avatar_path) order by p.tag)
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

-- Notification settings: types you switched off aren't shown (list, badge and live updates alike).
drop policy "Users see their own notifications" on public.notifications;
create policy "Users see their own notifications" on public.notifications for select to authenticated
  using (
    user_id = (select auth.uid())
    and (actor_id is null or not private.is_blocked(actor_id, (select auth.uid())))
    and not (type = any (coalesce((select p.notification_mutes from public.profiles p where p.id = (select auth.uid())), '{}')))
  );
