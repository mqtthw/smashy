-- Follows (one-way, Twitter-style) with "protected" accounts, and in-app notifications.
-- Protected accounts approve follow requests and keep follower/following lists private.
-- Under-18 accounts are ALWAYS protected; adults may opt in. (So a lock doesn't reveal age.)

-- ---------- Protected accounts ----------
alter table public.profiles add column protected boolean not null default false;
update public.profiles set protected = true where private.is_minor(id);

create function private.enforce_teen_protected() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if private.is_minor(new.id) then new.protected := true; end if;
  return new;
end;
$$;
create trigger profiles_teen_protected before insert or update on public.profiles
  for each row execute function private.enforce_teen_protected();

grant update (protected) on public.profiles to authenticated;

-- ---------- Follows ----------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, status);

alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert (follower_id, followee_id) on public.follows to authenticated;
grant update (status) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- You always see your own follows; others see a follow only if it's active and neither side is protected.
create policy "Follows visible unless a protected account is involved"
  on public.follows for select to anon, authenticated
  using (
    follower_id = (select auth.uid()) or followee_id = (select auth.uid())
    or (
      status = 'active'
      and not exists (select 1 from public.profiles p where p.id in (follower_id, followee_id) and p.protected)
    )
  );

create policy "Users follow as themselves (accounts they can see)"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = followee_id));

-- Only the followed person can accept a request (pending -> active).
create policy "Followees accept requests"
  on public.follows for update to authenticated
  using (followee_id = (select auth.uid()))
  with check (followee_id = (select auth.uid()) and status = 'active');

-- Either side can end it: unfollow / cancel request / remove follower / decline.
create policy "Either side can remove a follow"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

-- New follows of protected accounts start as requests, no matter what the client sends.
create function private.before_follow_insert() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  new.status := case when (select p.protected from public.profiles p where p.id = new.followee_id) then 'pending' else 'active' end;
  new.created_at := now();
  if (select count(*) from public.follows f where f.follower_id = new.follower_id and f.created_at > now() - interval '1 hour') >= 200 then
    raise exception 'You''re following people too fast. Try again later.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;
create trigger follows_before_insert before insert on public.follows
  for each row execute function private.before_follow_insert();

-- ---------- Notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,   -- who receives it
  actor_id uuid references public.profiles (id) on delete cascade,           -- who did it
  type text not null check (type in (
    'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
    'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected'
  )),
  post_id uuid references public.posts (id) on delete cascade,
  highlight_id uuid references public.highlights (id) on delete cascade,
  scene_id uuid references public.scenes (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users see their own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users mark their own notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users clear their own notifications" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.notifications;

-- Helper: create a notification (never for your own actions).
create function private.notify(recipient uuid, actor uuid, kind text, p_post uuid default null, p_highlight uuid default null)
  returns void language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, actor_id, type, post_id, highlight_id)
  select recipient, actor, kind, p_post, p_highlight
  where recipient is not null and recipient is distinct from actor;
$$;

create function private.notify_follow() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.followee_id, new.follower_id, case when new.status = 'pending' then 'follow_request' else 'follow' end);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'active' then
    delete from public.notifications where user_id = new.followee_id and actor_id = new.follower_id and type = 'follow_request';
    perform private.notify(new.follower_id, new.followee_id, 'follow_accepted');
  elsif tg_op = 'DELETE' then
    delete from public.notifications
      where user_id = old.followee_id and actor_id = old.follower_id and type in ('follow', 'follow_request');
  end if;
  return null;
end;
$$;
create trigger follows_notify after insert or update or delete on public.follows
  for each row execute function private.notify_follow();

create function private.notify_like() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify((select p.author_id from public.posts p where p.id = new.post_id), new.user_id, 'like', new.post_id);
  else
    delete from public.notifications where actor_id = old.user_id and post_id = old.post_id and type = 'like';
  end if;
  return null;
end;
$$;
create trigger post_likes_notify after insert or delete on public.post_likes
  for each row execute function private.notify_like();

create function private.notify_repost() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify((select p.author_id from public.posts p where p.id = new.post_id), new.user_id, 'repost', new.post_id);
  else
    delete from public.notifications where actor_id = old.user_id and post_id = old.post_id and type = 'repost';
  end if;
  return null;
end;
$$;
create trigger reposts_notify after insert or delete on public.reposts
  for each row execute function private.notify_repost();

create function private.notify_vote() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify((select h.author_id from public.highlights h where h.id = new.highlight_id), new.user_id, 'vote', null, new.highlight_id);
  else
    delete from public.notifications where actor_id = old.user_id and highlight_id = old.highlight_id and type = 'vote';
  end if;
  return null;
end;
$$;
create trigger highlight_votes_notify after insert or delete on public.highlight_votes
  for each row execute function private.notify_vote();

-- Replies and quotes: notify the author of the post being replied to / quoted (link to the new post).
create function private.notify_post() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.parent_id is not null then
    perform private.notify((select p.author_id from public.posts p where p.id = new.parent_id), new.author_id, 'reply', new.id);
  end if;
  if new.quote_of is not null then
    perform private.notify((select p.author_id from public.posts p where p.id = new.quote_of), new.author_id, 'quote', new.id);
  end if;
  return null;
end;
$$;
create trigger posts_notify after insert on public.posts
  for each row execute function private.notify_post();
