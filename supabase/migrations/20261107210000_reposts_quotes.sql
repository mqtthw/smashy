-- Reposts and quote posts (Twitter-style).
-- Repost = share a post as-is (its own row, timestamped when reposted).
-- Quote  = a new post with your comment that embeds another post (posts.quote_of).

-- ---------- Quotes ----------
alter table public.posts add column quote_of uuid references public.posts (id) on delete set null;
alter table public.posts add constraint posts_quote_not_self check (quote_of is null or quote_of <> id);
create index posts_quote_of_idx on public.posts (quote_of);

revoke insert on public.posts from authenticated;
grant insert (author_id, parent_id, game, body, ruleset_id, quote_of) on public.posts to authenticated;

-- Extend the insert checks: quotes must be top-level and point at a live post.
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
    if new.quote_of is not null then raise exception 'Replies can''t quote posts'; end if;
    new.game := parent.game;
    new.ruleset_id := parent.ruleset_id;
  elsif new.ruleset_id is not null then
    select r.game into new.game from public.rulesets r where r.id = new.ruleset_id;
  end if;

  if new.quote_of is not null and not exists (
    select 1 from public.posts q where q.id = new.quote_of and q.removed_at is null
  ) then
    raise exception 'Post not found';
  end if;

  if (select count(*) from public.posts p
       where p.author_id = new.author_id and p.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

-- ---------- Reposts ----------
create table public.reposts (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index reposts_user_idx on public.reposts (user_id, created_at desc);
create index reposts_time_idx on public.reposts (created_at desc);

alter table public.reposts enable row level security;
revoke all on public.reposts from anon, authenticated;
grant select on public.reposts to anon, authenticated;
grant insert (post_id, user_id) on public.reposts to authenticated;
grant delete on public.reposts to authenticated;

-- You see reposts of posts you're allowed to see (the posts policy applies inside).
create policy "Reposts follow post visibility"
  on public.reposts for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

-- Only top-level, non-removed posts can be reposted, and only as yourself.
create policy "Users repost as themselves"
  on public.reposts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id and p.parent_id is null and p.removed_at is null)
  );

create policy "Users undo their own reposts"
  on public.reposts for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Combined timeline: original posts + reposts ----------
-- security_invoker = true: the viewer's own privacy rules apply (teen posts, removed posts).
create view public.feed_items with (security_invoker = true) as
  select 'post'::text as kind, p.id as post_id, p.author_id as actor_id, p.created_at as at, p.game, p.ruleset_id
  from public.posts p
  where p.parent_id is null
  union all
  select 'repost'::text, r.post_id, r.user_id, r.created_at, p.game, p.ruleset_id
  from public.reposts r
  join public.posts p on p.id = r.post_id;

grant select on public.feed_items to anon, authenticated;
