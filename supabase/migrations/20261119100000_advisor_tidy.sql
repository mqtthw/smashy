-- Tidy-ups from Supabase's security advisor (no behavior change).

-- 1. limit_message_photo only runs as a trigger on messages; it never needs to be callable through the
--    API. (Triggers still fire: Postgres checks EXECUTE when a trigger is created, not when it runs.)
revoke execute on function public.limit_message_photo() from public, anon, authenticated;

-- 2. Keep extensions out of the public schema. The two people-search indexes (gin_trgm_ops) follow the
--    extension automatically; nothing calls its functions by name.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
