-- Blocks reach further, plus mutes and profile reports.

-- Blocking now also hides each other's posts and replies (everywhere: feeds, replies, search,
-- quotes) and notifications from the blocked person.
drop policy "Posts are visible; teen posts need sign-in; removed posts only to author" on public.posts;
create policy "Posts are visible; teen posts need sign-in; removed posts only to author; not between blocked people"
  on public.posts for select to anon, authenticated
  using (
    (removed_at is null or author_id = (select auth.uid()))
    and ((select auth.uid()) is not null or not private.is_minor(author_id))
    and ((select auth.uid()) is null or not private.is_blocked(author_id, (select auth.uid())))
  );

drop policy "Users see their own notifications" on public.notifications;
create policy "Users see their own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and (actor_id is null or not private.is_blocked(actor_id, (select auth.uid()))));

-- Mute: hide someone's posts and reposts from your feeds without blocking them (they aren't told,
-- and you can still visit their profile).
create table public.mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
alter table public.mutes enable row level security;
revoke all on public.mutes from anon, authenticated;
grant select, insert, delete on public.mutes to authenticated;
create policy "People see their own mutes" on public.mutes for select to authenticated using (muter_id = (select auth.uid()));
create policy "People mute for themselves" on public.mutes for insert to authenticated with check (muter_id = (select auth.uid()));
create policy "People unmute for themselves" on public.mutes for delete to authenticated using (muter_id = (select auth.uid()));

-- Report a profile (bad name, bio or picture).
alter table public.live_reports drop constraint live_reports_kind_check;
alter table public.live_reports add constraint live_reports_kind_check check (kind in ('chat', 'lobby', 'highlight', 'reel', 'message', 'profile'));
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove_post', 'restore_post', 'dismiss_reports', 'remove_chat', 'close_lobby', 'dismiss_live', 'remove_highlight', 'hide_reel', 'remove_message', 'clear_profile'));
