-- Round 3 review fixes (additive / backward compatible: the live site keeps working unchanged).

-- Blocked people's reposts are hidden too (feeds read reposts through views that follow these rules).
-- Keeps the existing teen rule: reposts by under-18s need sign-in to see.
drop policy "Reposts follow post visibility; teen reposts need sign-in" on public.reposts;
create policy "Reposts follow post visibility; teen reposts need sign-in; not between blocked people"
  on public.reposts for select to anon, authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id)
    and ((select auth.uid()) is not null or not private.is_minor(user_id))
    and ((select auth.uid()) is null or not private.is_blocked(user_id, (select auth.uid())))
  );

-- Typing / "Seen" signals: private Realtime channels, only for people in that chat.
-- Channel topic: "chat-signals:<conversation id>".
create function private.chat_topic_member(topic text) returns boolean
  language plpgsql stable security definer set search_path = ''
as $$
declare conv uuid;
begin
  if topic not like 'chat-signals:%' then return false; end if;
  begin
    conv := substr(topic, 14)::uuid;
  exception when others then
    return false;
  end;
  return private.member_status(conv, auth.uid()) in ('active', 'request');
end;
$$;
grant execute on function private.chat_topic_member(text) to authenticated;

create policy "Chat members receive chat signals" on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and private.chat_topic_member(realtime.topic()));
create policy "Chat members send chat signals" on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'broadcast' and private.chat_topic_member(realtime.topic()));
