-- Moderation: site admins review reports, hide posts (kept privately on record), and every
-- decision is logged. All moderation writes happen on the server with the secret key.

alter table public.posts
  add column removed_at timestamptz,
  add column removed_reason text check (removed_reason in ('spam', 'harassment', 'inappropriate', 'off_topic', 'other'));

-- Removed posts are hidden from everyone except their author (who sees "Removed by moderators").
drop policy "Posts are visible; teen posts need sign-in" on public.posts;
create policy "Posts are visible; teen posts need sign-in; removed posts only to author"
  on public.posts for select to anon, authenticated
  using (
    (removed_at is null or author_id = (select auth.uid()))
    and ((select auth.uid()) is not null or not private.is_minor(author_id))
  );

-- Can't like, reply to, or report a removed post.
drop policy "Users like as themselves" on public.post_likes;
create policy "Users like as themselves"
  on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.posts p where p.id = post_id and p.removed_at is null));

create or replace function private.before_post_insert() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is not null then
    select p.parent_id, p.game, p.ruleset_id, p.removed_at into parent from public.posts p where p.id = new.parent_id;
    if not found or parent.removed_at is not null then raise exception 'Post not found'; end if;
    if parent.parent_id is not null then raise exception 'Replies can''t have replies'; end if;
    new.game := parent.game;
    new.ruleset_id := parent.ruleset_id;
  elsif new.ruleset_id is not null then
    select r.game into new.game from public.rulesets r where r.id = new.ruleset_id;
  end if;

  if (select count(*) from public.posts p
       where p.author_id = new.author_id and p.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

-- Private log of every moderation decision.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('remove_post', 'restore_post', 'dismiss_reports')),
  post_id uuid references public.posts (id) on delete set null,
  reason text,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index moderation_actions_post_idx on public.moderation_actions (post_id, created_at desc);

alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from anon, authenticated;

-- Removal columns are server-only (users already can't update posts at all; this keeps it explicit).
revoke update on public.posts from anon, authenticated;
