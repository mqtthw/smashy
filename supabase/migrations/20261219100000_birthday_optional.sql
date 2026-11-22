-- A birthday is optional at sign-up (Matthew, 2026-11-13: the birthday screen scared people away).
--
-- Until now a profile could only be created after a birthday was saved (the 13+ age gate). Now anyone
-- signed in can create their own profile without one. Nothing else changes, because every age rule
-- already treats "no birthday on file" as a teen (private.is_minor returns true when there is no row):
-- the profile is hidden from guests, it starts private, messages follow the teen rules, and contact
-- details are blocked in posts. Adding a birthday later works as before (once, never changed), and the
-- database still refuses a birthday under 13.
--
-- Only this one rule changes; no data is changed or deleted.

drop policy "Users create their own profile after the age gate" on public.profiles;

create policy "Users create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
