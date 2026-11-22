-- First wave (additive / backward compatible): discussion threads, spoilers, matchup tags, push notifications.

-- ---------- Discussion threads ----------
-- A thread is a top-level post with a title (and a flair). Threads can be longer than normal posts.
-- Replies still point at the thread (parent_id); reply_to says which reply they answer, so replies
-- can be shown as a tree. Older posts are unchanged (no title, no reply_to).
alter table public.posts
  add column title text check (title is null or char_length(btrim(title)) between 3 and 120),
  add column flair text check (flair is null or flair in ('question', 'discussion', 'analysis', 'news', 'meme', 'art', 'help')),
  add column reply_to uuid references public.posts (id) on delete set null,
  add column spoiler boolean not null default false,
  add column vs_character text check (vs_character is null or vs_character ~ '^[a-z0-9-]{2,40}$');
alter table public.posts add constraint posts_title_top_level check (title is null or parent_id is null);
alter table public.posts add constraint posts_flair_needs_title check (flair is null or title is not null);
alter table public.posts add constraint posts_reply_to_is_reply check (reply_to is null or parent_id is not null);

alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check
  check (char_length(btrim(body)) between 1 and (case when title is null then 500 else 5000 end));

create index posts_threads_idx on public.posts (game, created_at desc) where title is not null and parent_id is null;
create index posts_reply_to_idx on public.posts (reply_to) where reply_to is not null;
create index posts_matchup_idx on public.posts (game, character, vs_character) where vs_character is not null;

grant insert (title, flair, reply_to, spoiler, vs_character) on public.posts to authenticated;

-- Search finds thread titles first, then the text.
drop index if exists public.posts_search_idx;
alter table public.posts drop column search_vec;
alter table public.posts add column search_vec tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(body, '')), 'B')
) stored;
create index posts_search_idx on public.posts using gin (search_vec);

-- reply_to must be a live reply in the same thread; teens' titles get the same contact check as bodies.
create function private.check_thread_fields() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.reply_to is not null and not exists (
    select 1 from public.posts r where r.id = new.reply_to and r.parent_id = new.parent_id and r.removed_at is null
  ) then
    raise exception 'That reply isn''t available.' using errcode = 'P0001';
  end if;
  if new.title is not null and private.is_minor(new.author_id) and private.has_contact_info(new.title) then
    raise exception 'Posts can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger posts_check_thread_fields before insert on public.posts
  for each row execute function private.check_thread_fields();

-- Whoever wrote the reply you answered hears about it (the thread's author already does).
create function private.notify_reply_to() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare target uuid; thread_author uuid;
begin
  select author_id into target from public.posts where id = new.reply_to;
  select author_id into thread_author from public.posts where id = new.parent_id;
  if target is distinct from thread_author then
    perform private.notify(target, new.author_id, 'reply', new.id);
  end if;
  return null;
end;
$$;
create trigger posts_notify_reply_to after insert on public.posts
  for each row when (new.reply_to is not null) execute function private.notify_reply_to();

-- Editing (15 minutes, as before): threads can be up to 5000 characters.
create or replace function public.edit_post(post uuid, new_body text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare p record; b text := btrim(coalesce(new_body, ''));
begin
  select * into p from public.posts where id = post;
  if p is null or p.author_id is distinct from auth.uid() then raise exception 'You can only edit your own posts.' using errcode = 'P0001'; end if;
  if p.removed_at is not null then raise exception 'This post was removed.' using errcode = 'P0001'; end if;
  if p.created_at < now() - interval '15 minutes' then raise exception 'Posts can only be edited for 15 minutes.' using errcode = 'P0001'; end if;
  if char_length(b) not between 1 and (case when p.title is null then 500 else 5000 end) then
    raise exception 'Posts can be 1 to % characters.', (case when p.title is null then 500 else 5000 end) using errcode = 'P0001';
  end if;
  if private.is_minor(p.author_id) and private.has_contact_info(b) then
    raise exception 'Posts can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('edit_post', 20, interval '10 minutes');
  update public.posts set body = b, edited_at = now() where id = post;
end;
$$;

-- ---------- Matchups: guides and VODs for "Fox vs Marth" ----------
alter table public.highlights
  add column vs_character text check (vs_character is null or vs_character ~ '^[a-z0-9-]{2,40}$');
alter table public.highlights drop constraint if exists highlights_type_check;
alter table public.highlights add constraint highlights_type_check
  check (type in ('combo_video', 'guide', 'matchup', 'tech', 'frame_data', 'vod', 'other'));
create index highlights_matchup_idx on public.highlights (game, character, vs_character) where vs_character is not null;
grant insert (vs_character) on public.highlights to authenticated;

-- ---------- Push notifications ----------
-- One row per device that turned notifications on. People only see and manage their own.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth) on public.push_subscriptions to authenticated;
create policy "Own push subscriptions" on public.push_subscriptions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Where to send "please push this" calls, and the shared secret (written by the server, never public).
create table public.push_config (
  id int primary key default 1 check (id = 1),
  endpoint text not null,
  secret text not null
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

create extension if not exists pg_net with schema extensions;

-- When a notification worth a push arrives (or a direct message), ask the app to send it. Only the
-- id is sent; the app looks everything else up and checks mutes. Nothing happens until push_config is set.
create function private.request_push(kind text, ref uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare cfg record;
begin
  select endpoint, secret into cfg from public.push_config where id = 1;
  if cfg is null then return; end if;
  perform net.http_post(
    url := cfg.endpoint,
    body := jsonb_build_object('kind', kind, 'id', ref),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.secret)
  );
exception when others then
  null; -- a push is never worth failing the original action
end;
$$;

create function private.push_notification() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.type in ('reply', 'mention', 'quote', 'follow', 'follow_request', 'follow_accepted', 'message_request', 'major_live', 'event_reminder') then
    perform private.request_push('notification', new.id);
  end if;
  return null;
end;
$$;
create trigger notifications_push after insert on public.notifications
  for each row execute function private.push_notification();

create function private.push_message() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  perform private.request_push('message', new.id);
  return null;
end;
$$;
create trigger messages_push after insert on public.messages
  for each row when (new.sender_id is not null) execute function private.push_message();
