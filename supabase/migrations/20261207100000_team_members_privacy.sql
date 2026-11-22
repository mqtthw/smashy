-- Doubles follow-up: a team with a member under 18 is hidden from people who aren't signed in, and
-- so must be the rows saying who is on it.
--
-- The rule added yesterday looked the team up to see whether it's hidden. But that lookup runs with
-- the visitor's own access: a signed-out visitor can't see the hidden team, so the lookup found
-- nothing, concluded "not hidden", and showed the member rows anyway (the team's two names and
-- account ids). The database test for doubles caught it before any doubles event existed.
--
-- The fix: the lookup goes through a small function that reads the team with the database's own
-- access, the same way the teen-profile rule uses private.is_minor.
--
-- Nothing here changes or deletes rows.

create function private.team_needs_sign_in(team uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.hosted_guests g where g.id = team and g.members_only);
$$;
revoke all on function private.team_needs_sign_in(uuid) from public;
grant execute on function private.team_needs_sign_in(uuid) to anon, authenticated;

drop policy "Team members are public; teams with a teen need sign-in" on public.hosted_team_members;
create policy "Team members are public; teams with a teen need sign-in" on public.hosted_team_members for select
  using ((select auth.uid()) is not null or not private.team_needs_sign_in(guest_id));
