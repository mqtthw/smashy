-- Edit a post for 15 minutes, @mentions (with notifications), and a notification for new message requests.

-- ---------- Editing ----------
alter table public.posts add column edited_at timestamptz;

create function public.edit_post(post uuid, new_body text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare p record; b text := btrim(coalesce(new_body, ''));
begin
  select * into p from public.posts where id = post;
  if p is null or p.author_id is distinct from auth.uid() then raise exception 'You can only edit your own posts.' using errcode = 'P0001'; end if;
  if p.removed_at is not null then raise exception 'This post was removed.' using errcode = 'P0001'; end if;
  if p.created_at < now() - interval '15 minutes' then raise exception 'Posts can only be edited for 15 minutes.' using errcode = 'P0001'; end if;
  if char_length(b) not between 1 and 500 then raise exception 'Posts can be 1 to 500 characters.' using errcode = 'P0001'; end if;
  if private.is_minor(p.author_id) and private.has_contact_info(b) then
    raise exception 'Posts can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('edit_post', 20, interval '10 minutes');
  update public.posts set body = b, edited_at = now() where id = post;
end;
$$;
revoke all on function public.edit_post(uuid, text) from public, anon;
grant execute on function public.edit_post(uuid, text) to authenticated;

-- ---------- Notifications: mentions and message requests ----------
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request'
));
alter table public.notifications add column conversation_id uuid references public.conversations (id) on delete cascade;

-- "@handle" in a new post notifies that person (up to 10 per post; not yourself, not across a block).
-- Opening the notification still follows the post's own visibility rules.
create function private.notify_mentions() returns trigger language plpgsql security definer set search_path = '' as $$
declare h text; target uuid; n int := 0;
begin
  for h in select distinct lower(m[1]) from regexp_matches(new.body, '(?:^|[^A-Za-z0-9_&])@([A-Za-z0-9_]{3,20})', 'g') as m loop
    exit when n >= 10;
    select id into target from public.profiles where handle = h;
    if target is not null and target <> new.author_id and not private.is_blocked(target, new.author_id) then
      insert into public.notifications (user_id, actor_id, type, post_id) values (target, new.author_id, 'mention', new.id);
      n := n + 1;
    end if;
  end loop;
  return new;
end; $$;
create trigger posts_notify_mentions after insert on public.posts for each row execute function private.notify_mentions();

-- First message of a request: tell the person it went to.
create or replace function private.after_message() returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at where conversation_id = new.conversation_id and user_id = new.sender_id;
  update public.conversation_members m set status = 'active'
    from public.conversations c
    where c.id = new.conversation_id and c.kind = 'direct' and m.conversation_id = c.id and m.user_id <> new.sender_id and m.status = 'left';
  select m.user_id into recipient from public.conversation_members m
    where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id and m.status = 'request';
  if recipient is not null and not exists (
    select 1 from public.messages where conversation_id = new.conversation_id and sender_id = new.sender_id and id <> new.id
  ) then
    insert into public.notifications (user_id, actor_id, type, conversation_id) values (recipient, new.sender_id, 'message_request', new.conversation_id);
  end if;
  return new;
end; $$;
