-- Each member's language (en, es or ja), so alerts and phone pushes Smashy sends them are written in it.
--
-- Set when a member picks a language with the switch, and from their browser's language when they
-- sign in (if they haven't picked one). Empty for members who haven't signed in since: they get
-- English, as before. Not sensitive (it's which language the site shows them), so it sits on the
-- profile like the region; members can only change their own (the existing profile rules).
--
-- Nothing here changes or deletes existing data.

alter table public.profiles add column lang text check (lang is null or lang in ('en', 'es', 'ja'));
grant insert (lang), update (lang) on public.profiles to authenticated;
