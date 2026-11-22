-- Fix: a teen reposting an adult's post was visible to guests ("TestTeen reposted"),
-- which reveals a minor's activity. Reposts BY under-18 users now need sign-in to see,
-- just like their posts.
drop policy "Reposts follow post visibility" on public.reposts;
create policy "Reposts follow post visibility; teen reposts need sign-in"
  on public.reposts for select to anon, authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id)
    and ((select auth.uid()) is not null or not private.is_minor(user_id))
  );
