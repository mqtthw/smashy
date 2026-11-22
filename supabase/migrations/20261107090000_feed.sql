-- Basic feed: text posts, one level of replies, likes, reports.
-- Privacy: posts AND profiles of players under 18 are visible only to signed-in users.

-- ---------- Private helpers (not exposed through the public API) ----------
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- True if the user is under 18 (or has no birthdate on file, to be safe).
create function private.is_minor(uid uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(
    (select d.date_of_birth > (current_date - interval '18 years')
       from public.private_profile_data d where d.user_id = uid),
    true
  );
$$;
revoke all on function private.is_minor(uuid) from public;
grant execute on function private.is_minor(uuid) to anon, authenticated;

-- ---------- Profiles: hide teens from guests ----------
drop policy "Profiles are public" on public.profiles;
create policy "Adult profiles are public; teen profiles need sign-in"
  on public.profiles for select to anon, authenticated
  using ((select auth.uid()) is not null or not private.is_minor(id));

-- ---------- Posts (replies are posts with a parent) ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.posts (id) on delete cascade,
  game text not null default 'general' check (game in ('melee', 'ultimate', 'pplus', 'general')),
  body text not null check (char_length(btrim(body)) between 1 and 500),

  -- Optional event card, attached only by the server after checking start.gg
  template text check (template in ('placed', 'signed_up')),
  tournament_slug text,
  tournament_name text,
  event_name text,
  event_start_at timestamptz,
  placement int check (placement > 0),
  num_entrants int check (num_entrants > 0),

  created_at timestamptz not null default now()
);

create index posts_feed_idx on public.posts (created_at desc) where parent_id is null;
create index posts_game_feed_idx on public.posts (game, created_at desc) where parent_id is null;
create index posts_replies_idx on public.posts (parent_id, created_at);
create index posts_author_idx on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

grant select on public.posts to anon, authenticated;
-- Users may only write these columns; event cards come from the server (secret key).
grant insert (author_id, parent_id, game, body) on public.posts to authenticated;
grant delete on public.posts to authenticated;

create policy "Posts are visible; teen posts need sign-in"
  on public.posts for select to anon, authenticated
  using ((select auth.uid()) is not null or not private.is_minor(author_id));

create policy "Users write their own posts"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Users delete their own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = author_id);

-- Replies: one level deep, same game as the post. Plus a simple spam brake.
create function private.before_post_insert() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is not null then
    select p.parent_id, p.game into parent from public.posts p where p.id = new.parent_id;
    if not found then raise exception 'Post not found'; end if;
    if parent.parent_id is not null then raise exception 'Replies can''t have replies'; end if;
    new.game := parent.game;
  end if;

  if (select count(*) from public.posts p
       where p.author_id = new.author_id and p.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

create trigger posts_before_insert
  before insert on public.posts
  for each row execute function private.before_post_insert();

-- ---------- Likes ----------
create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;
grant select on public.post_likes to anon, authenticated;
grant insert, delete on public.post_likes to authenticated;

-- You can see likes on posts you can see (the posts policy applies inside this check).
create policy "Likes follow post visibility"
  on public.post_likes for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "Users like as themselves"
  on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.posts p where p.id = post_id));

create policy "Users unlike their own likes"
  on public.post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- Reports (reviewed by admins later) ----------
create table public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'off_topic', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.post_reports enable row level security;
revoke all on public.post_reports from anon;
grant insert (post_id, reporter_id, reason, details) on public.post_reports to authenticated;

-- Reporters can file reports but not read the queue; admins use the secret key.
create policy "Users file reports as themselves"
  on public.post_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and exists (select 1 from public.posts p where p.id = post_id));
