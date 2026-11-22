-- Teen profiles and posts need a finished Smashy profile to see, not just a login (round 695; the 11-10 code
-- review's D14, raised again by the pre-open-source security review).
--
-- Teen content was hidden from guests with "(select auth.uid()) is not null": any email login passed,
-- even one that never created a profile, so "hidden from people who aren't signed in" was only as strong as
-- typing an email address. Now the viewer needs a profiles row (private.viewer_has_profile). Nothing
-- changes for players with a profile; someone mid-sign-up sees teen content once they create theirs.
--
-- The same seven read rules as before, each with only that one test swapped. No data changes.

create function private.viewer_has_profile() returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid())); $$;
revoke all on function private.viewer_has_profile() from public;
grant execute on function private.viewer_has_profile() to anon, authenticated;

drop policy "Adult profiles are public; teen profiles need sign-in" on public.profiles;
create policy "Adult profiles are public; teen profiles need a Smashy profile"
  on public.profiles for select to anon, authenticated
  using ((select private.viewer_has_profile()) or not private.is_minor(id));

drop policy "Posts are visible; teen posts need sign-in; removed posts only " on public.posts;
create policy "Posts visible; teen posts need a profile; removed: author only"
  on public.posts for select to anon, authenticated
  using (
    (removed_at is null or author_id = (select auth.uid()))
    and ((select private.viewer_has_profile()) or not private.is_minor(author_id))
    and ((select auth.uid()) is null or not private.is_blocked(author_id, (select auth.uid())))
  );

drop policy "Highlights visible like posts" on public.highlights;
create policy "Highlights visible like posts"
  on public.highlights for select to anon, authenticated
  using (
    (removed_at is null or author_id = (select auth.uid()))
    and ((select private.viewer_has_profile()) or not private.is_minor(author_id))
    and ((select auth.uid()) is null or not private.is_blocked(author_id, (select auth.uid())))
  );

drop policy "Reactions follow post visibility; teen reactions need sign-in" on public.post_reactions;
create policy "Reactions follow post visibility; teen ones need a profile"
  on public.post_reactions for select to anon, authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_reactions.post_id)
    and ((select private.viewer_has_profile()) or not private.is_minor(user_id))
  );

drop policy "Reposts follow post visibility; teen reposts need sign-in; not " on public.reposts;
create policy "Reposts follow post visibility; teen reposts need a profile"
  on public.reposts for select to anon, authenticated
  using (
    exists (select 1 from public.posts p where p.id = reposts.post_id)
    and ((select private.viewer_has_profile()) or not private.is_minor(user_id))
    and ((select auth.uid()) is null or not private.is_blocked(user_id, (select auth.uid())))
  );

drop policy "Replay stats: the owner, or shown ones (teens' only to signed-i" on public.replay_stats;
create policy "Replay stats: owner, or shown (teens' only with a profile)"
  on public.replay_stats for select to anon, authenticated
  using (user_id = (select auth.uid()) or (shown and ((select private.viewer_has_profile()) or not private.is_minor(user_id))));

drop policy "Members are visible; teen members need sign-in" on public.scene_members;
create policy "Members are visible; teen members need a profile"
  on public.scene_members for select to anon, authenticated
  using ((select private.viewer_has_profile()) or not private.is_minor(user_id));
