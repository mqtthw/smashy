-- French joins the languages a member's profile can have (en, es, ja, fr), so alerts and phone pushes
-- can be written in French. Only the allowed list changes; nothing else.

alter table public.profiles drop constraint profiles_lang_check;
alter table public.profiles add constraint profiles_lang_check check (lang is null or lang in ('en', 'es', 'ja', 'fr'));
