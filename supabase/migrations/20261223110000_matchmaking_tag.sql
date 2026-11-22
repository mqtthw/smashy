-- Fix for round 398: room chat refused every message with "@matchmaking" in it, because the
-- contact-info rule treats any "@name" as a social media handle. The chat rule now reads the exact
-- tag "@matchmaking" as plain "matchmaking" before checking; every other "@name" is still refused.
-- (Loosens one rule on one table, so every message already there still passes.)

create or replace function private.chat_text_for_check(t text) returns text
  language sql immutable set search_path = ''
as $$ select regexp_replace(t, '@matchmaking(?![A-Za-z0-9_])', 'matchmaking', 'gi'); $$;
revoke all on function private.chat_text_for_check(text) from public;

alter table public.chat_messages drop constraint chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check check (
  char_length(btrim(body)) between 1 and 280
  and not private.has_contact_info(private.chat_text_for_check(body))
);
