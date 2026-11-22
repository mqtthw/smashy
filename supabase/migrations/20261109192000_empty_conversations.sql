-- Chats nobody is in anymore (everyone left, or their accounts were deleted). The server cleans
-- them up (their photos too) with the scheduled job and after an account is deleted.
create function public.empty_conversations() returns setof uuid
  language sql stable security definer set search_path = ''
as $$
  select c.id from public.conversations c
  where not exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.status <> 'left')
  limit 200;
$$;
revoke all on function public.empty_conversations() from public, anon, authenticated;
