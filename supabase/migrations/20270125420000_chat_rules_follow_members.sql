-- Round 722, follow-up: a chat's photo and contact-info rules follow who is in it now, not its saved
-- label. The first file also treated a chat labelled "teen" as a teen chat, so two people who had both
-- turned 18 were told photos were allowed (the app's check looks at the members) and then refused
-- (this trigger looked at the label too) until one of them reopened the chat from a profile.
-- Only this one function changes; it can be run again.
create or replace function private.before_message() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare teen boolean;
begin
  -- Photos are added by the server (after the safety check), into this conversation's folder.
  if new.image_path is not null and new.image_path not like new.conversation_id::text || '/' || new.sender_id::text || '/%' then
    raise exception 'That photo can''t be used here.' using errcode = 'P0001';
  end if;
  -- Anyone under 18 in the chat (active, or with a request waiting): no photos, no contact info.
  teen := private.conversation_has_teen(new.conversation_id);
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
