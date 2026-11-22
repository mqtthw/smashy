-- Database-side fixes from the full code review of 2026-11-10 (docs/code-review-2026-11-10.md).
-- The database is the real security boundary: someone with an ordinary account can call it
-- directly and skip the app's own checks, so these rules live here.
--
--   1. Blocks:       no replying to or quoting someone across a block; blocks also apply to
--                    notifications, highlights, Play lobbies and Play chat.
--   2. Contact info: the no-links / no-contact-info rule on profiles (everyone), and on teens'
--                    highlights, poll options and online-event "who it's for"; lobby region.
--   3. Limits:       limits that count attempts, so deleting and repeating doesn't reset them;
--                    limits on RSVPs, scene requests, avatar uploads and translations.
--   4. Lobbies:      a host can close their lobby but not reopen one (e.g. one a moderator closed).
--   5. Push:         only real push services, at most 10 devices per person.
--   6. Mentions:     a link like youtube.com/@name no longer notifies the Smashy user "name".
--   7. Messages:     two teens who both turned 18 can message again; a chat keeps the other
--                    person's name after they remove it from their inbox; reaction changes are
--                    no longer broadcast from the database.
--   8. Housekeeping: missing indexes, size limits on a few lists.
--
-- Nothing here deletes or rewrites existing rows. New checks are added "not valid", which means
-- they apply to new and changed rows only.

-- ---------------------------------------------------------------------------------------------
-- 3 (first, because the rest uses it). Limits that count attempts.
-- ---------------------------------------------------------------------------------------------

-- Like private.rate_limit, with its own message. Takes a short lock per person and action so
-- several requests sent at the same moment are counted one at a time (they used to all pass).
create or replace function private.rate_limit_as(p_action text, p_max int, p_win interval, p_message text) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if; -- the server itself (seeds, moderation) isn't limited
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_action, 0));
  if (select count(*) from private.rate_events e where e.user_id = uid and e.action = p_action and e.at > now() - p_win) >= p_max then
    raise exception '%', p_message using errcode = 'P0429';
  end if;
  insert into private.rate_events (user_id, action) values (uid, p_action);
end;
$$;
revoke all on function private.rate_limit_as(text, int, interval, text) from public;

create or replace function private.rate_limit(action text, max_n int, win interval) returns void
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform private.rate_limit_as(action, max_n, win, 'You''re doing that too fast. Wait a few minutes and try again.');
end;
$$;

-- Limits the app asks for by name before doing something costly (each avatar upload and each
-- translation calls a paid service). Signed-in people only.
create or replace function public.limit_action(action text) returns void
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if action = 'avatar_upload' then
    perform private.rate_limit_as('avatar_upload', 10, interval '1 hour', 'You''ve changed your picture a lot. Try again in a bit.');
  elsif action = 'translate' then
    perform private.rate_limit_as('translate', 120, interval '1 hour', 'You''ve translated a lot of posts. Try again in a bit.');
  else
    raise exception 'Unknown action.' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.limit_action(text) from public, anon;
grant execute on function public.limit_action(text) to authenticated;

-- Follows: the hourly limit counted follows that still exist, so follow / unfollow in a loop sent
-- unlimited "followed you" notifications. Attempts are counted now too.
create or replace function private.before_follow_insert() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  new.status := case when (select p.protected from public.profiles p where p.id = new.followee_id) then 'pending' else 'active' end;
  new.created_at := now();
  if (select count(*) from public.follows f where f.follower_id = new.follower_id and f.created_at > now() - interval '1 hour') >= 200 then
    raise exception 'You''re following people too fast. Try again later.' using errcode = 'P0429';
  end if;
  perform private.rate_limit_as('follow', 200, interval '1 hour', 'You''re following people too fast. Try again later.');
  return new;
end;
$$;

create or replace function private.limit_rsvps() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$ begin perform private.rate_limit('rsvp', 60, interval '1 hour'); return new; end; $$;
drop trigger if exists event_rsvps_rate on public.event_rsvps;
create trigger event_rsvps_rate before insert on public.event_rsvps for each row execute function private.limit_rsvps();

create or replace function private.limit_scene_requests() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$ begin perform private.rate_limit('scene_request', 5, interval '1 day'); return new; end; $$;
drop trigger if exists scenes_rate on public.scenes;
create trigger scenes_rate before insert on public.scenes for each row execute function private.limit_scene_requests();

create or replace function private.limit_scene_admin_requests() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$ begin perform private.rate_limit('scene_admin_request', 20, interval '1 day'); return new; end; $$;
drop trigger if exists scene_admins_rate on public.scene_admins;
create trigger scene_admins_rate before insert on public.scene_admins for each row execute function private.limit_scene_admin_requests();

-- ---------------------------------------------------------------------------------------------
-- 1. Blocks.
-- ---------------------------------------------------------------------------------------------

-- Posts. Unchanged from 20261129100000_new_account_post_limit.sql except:
--   * a reply to, or quote of, a post by someone on either side of a block is refused (it looks
--     the same as a post that doesn't exist);
--   * the 5-a-minute and new-account 10-an-hour limits also count attempts, so deleting a post
--     doesn't give the slot back.
create or replace function private.before_post_insert() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is not null then
    select p.parent_id, p.game, p.ruleset_id, p.removed_at, p.author_id into parent from public.posts p where p.id = new.parent_id;
    if not found or parent.removed_at is not null or private.is_blocked(parent.author_id, new.author_id) then raise exception 'Post not found'; end if;
    if parent.parent_id is not null then raise exception 'Replies can''t have replies'; end if;
    if new.quote_of is not null then raise exception 'Replies can''t quote posts'; end if;
    new.game := parent.game;
    new.ruleset_id := parent.ruleset_id;
  elsif new.ruleset_id is not null then
    select r.game into new.game from public.rulesets r where r.id = new.ruleset_id;
  end if;

  if new.quote_of is not null and not exists (
    select 1 from public.posts q
     where q.id = new.quote_of and q.removed_at is null and not private.is_blocked(q.author_id, new.author_id)
  ) then
    raise exception 'Post not found';
  end if;

  if (select count(*) from public.posts p
       where p.author_id = new.author_id and p.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0429';
  end if;
  perform private.rate_limit_as('post', 5, interval '1 minute', 'You''re posting too fast. Wait a minute and try again.');

  -- New accounts: at most 10 posts and replies an hour for their first 7 days. Only counts when
  -- the person is posting as themself (not the server), and never applies to site admins.
  if (select auth.uid()) = new.author_id
     and not private.is_site_admin(new.author_id)
     and exists (select 1 from public.profiles pr
                  where pr.id = new.author_id and pr.created_at > now() - interval '7 days') then
    if (select count(*) from public.posts p
         where p.author_id = new.author_id and p.created_at > now() - interval '1 hour') >= 10 then
      raise exception 'New accounts can post 10 times an hour in their first week. Try again in a bit.' using errcode = 'P0429';
    end if;
    perform private.rate_limit_as('post_new', 10, interval '1 hour', 'New accounts can post 10 times an hour in their first week. Try again in a bit.');
  end if;
  return new;
end;
$$;

-- Replying to a specific reply: the same block rule.
create or replace function private.check_thread_fields() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if new.reply_to is not null and not exists (
    select 1 from public.posts r
     where r.id = new.reply_to and r.parent_id = new.parent_id and r.removed_at is null
       and not private.is_blocked(r.author_id, new.author_id)
  ) then
    raise exception 'That reply isn''t available.' using errcode = 'P0001';
  end if;
  if new.title is not null and private.is_minor(new.author_id) and private.has_contact_info(new.title) then
    raise exception 'Posts can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Notifications are never created across a block (likes, reposts, replies, quotes, votes...).
create or replace function private.notify(recipient uuid, actor uuid, kind text, p_post uuid default null, p_highlight uuid default null) returns void
  language sql security definer
  set search_path = ''
as $$
  insert into public.notifications (user_id, actor_id, type, post_id, highlight_id)
  select recipient, actor, kind, p_post, p_highlight
  where recipient is not null and recipient is distinct from actor
    and (actor is null or not private.is_blocked(recipient, actor));
$$;

-- Highlights (guides and clips): hidden across a block, like posts.
drop policy if exists "Highlights visible like posts" on public.highlights;
create policy "Highlights visible like posts" on public.highlights for select to anon, authenticated
  using (
    (removed_at is null or author_id = (select auth.uid()))
    and ((select auth.uid()) is not null or not private.is_minor(author_id))
    and ((select auth.uid()) is null or not private.is_blocked(author_id, (select auth.uid())))
  );

-- Play lobbies: a blocked person no longer sees the lobby (and its connect code).
drop policy if exists "Signed-in users see open lobbies (and their own)" on public.lobbies;
create policy "Signed-in users see open lobbies (and their own)" on public.lobbies for select to authenticated
  using (
    (closed_at is null and closes_at > now() and not private.is_blocked(host_id, (select auth.uid())))
    or host_id = (select auth.uid())
  );

-- Play chat: messages are hidden across a block (live updates follow this rule too).
drop policy if exists "Signed-in users read the last 24 hours of chat" on public.chat_messages;
create policy "Signed-in users read the last 24 hours of chat" on public.chat_messages for select to authenticated
  using (
    removed_at is null and created_at > now() - interval '24 hours'
    and not private.is_blocked(author_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------------------------
-- 4. Lobbies: a host can close their own open lobby, and nothing else.
-- ---------------------------------------------------------------------------------------------
drop policy if exists "Hosts close their own lobbies" on public.lobbies;
create policy "Hosts close their own lobbies" on public.lobbies for update to authenticated
  using (host_id = (select auth.uid()) and closed_at is null)
  with check (host_id = (select auth.uid()) and closed_at is not null);

-- ---------------------------------------------------------------------------------------------
-- 2. Contact info.
-- ---------------------------------------------------------------------------------------------

-- Profiles are public: no links, phone numbers, emails or social handles in the tag, bio, city or
-- crew. The app already refuses these; this stops them being set by calling the database directly.
-- Only fields that are being set or changed are checked, so an older profile can still be edited.
create or replace function private.check_profile_contact() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if (select auth.uid()) is null then return new; end if; -- the server itself (seeds, moderation)
  if ((tg_op = 'INSERT' or new.tag is distinct from old.tag) and private.has_contact_info(new.tag))
     or ((tg_op = 'INSERT' or new.bio is distinct from old.bio) and private.has_contact_info(coalesce(new.bio, '')))
     or ((tg_op = 'INSERT' or new.home_city is distinct from old.home_city) and private.has_contact_info(coalesce(new.home_city, '')))
     or ((tg_op = 'INSERT' or new.crew is distinct from old.crew) and private.has_contact_info(coalesce(new.crew, ''))) then
    raise exception 'Profiles can''t include links, phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_contact_info on public.profiles;
create trigger profiles_contact_info before insert or update on public.profiles for each row execute function private.check_profile_contact();

-- Highlights. Unchanged except: attempts are counted (see 3), and for under-18s the text can't
-- contain contact info and the link can't point at a chat or social app.
create or replace function private.before_highlight_insert() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if (select count(*) from public.highlights h
       where h.author_id = new.author_id and h.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You''ve added a lot of highlights recently. Try again in a bit.' using errcode = 'P0429';
  end if;
  perform private.rate_limit_as('highlight', 10, interval '1 hour', 'You''ve added a lot of highlights recently. Try again in a bit.');
  if private.is_minor(new.author_id) then
    if private.has_contact_info(concat_ws(' ', new.title, new.description, new.guide_body)) then
      raise exception 'Sharing or asking for contact info isn''t allowed here.' using errcode = 'P0001';
    end if;
    if new.url ~* '^https?://([a-z0-9-]+\.)*(discord\.gg|discord\.com|discordapp\.com|instagram\.com|snapchat\.com|tiktok\.com|t\.me|telegram\.org|telegram\.me|wa\.me|whatsapp\.com|kik\.me|facebook\.com|fb\.me|messenger\.com|linktr\.ee)([/?#]|$)' then
      raise exception 'That link can''t be shared here.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- Polls: no empty options; no contact info in a teen's options.
create or replace function private.check_poll() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if array_position(new.options, null) is not null then
    raise exception 'Poll options can''t be empty.' using errcode = 'P0001';
  end if;
  if private.is_minor((select p.author_id from public.posts p where p.id = new.post_id))
     and private.has_contact_info(array_to_string(new.options, ' | ')) then
    raise exception 'Sharing or asking for contact info isn''t allowed here.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists polls_check on public.polls;
create trigger polls_check before insert on public.polls for each row execute function private.check_poll();

-- Lobbies: the region line gets the same rule as the title and notes.
alter table public.lobbies drop constraint if exists lobbies_region_no_contact;
alter table public.lobbies add constraint lobbies_region_no_contact check (region is null or not private.has_contact_info(region)) not valid;

-- Hosted events. Unchanged except that a teen host's "who it's for" line (region) is checked too.
create or replace function private.before_hosted_event() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.rate_limit('host_event', 5, interval '1 day');
    if new.starts_at < now() + interval '10 minutes' then
      raise exception 'Pick a start time at least 10 minutes from now.' using errcode = 'P0001';
    end if;
  end if;
  if new.starts_at > now() + interval '1 year' then
    raise exception 'Events can be up to a year ahead.' using errcode = 'P0001';
  end if;
  if new.series_id is not null and (tg_op = 'INSERT' or new.series_id is distinct from old.series_id)
     and (select e.host_id from public.hosted_events e where e.id = new.series_id) is distinct from new.host_id then
    raise exception 'You can only add editions to your own series.' using errcode = 'P0001';
  end if;
  if private.is_minor(new.host_id) and (
       private.has_contact_info(new.name)
       or private.has_contact_info(coalesce(new.description, ''))
       or private.has_contact_info(coalesce(new.location, ''))
       or private.has_contact_info(coalesce(new.region, ''))) then
    raise exception 'Event details can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 5. Push subscriptions: real push services only, and at most 10 devices per person.
-- ---------------------------------------------------------------------------------------------
-- (Chrome, Edge on Android, Brave, Opera and Samsung Internet use Google's service; Firefox uses
-- Mozilla's; Edge on Windows uses Microsoft's; Safari uses Apple's.)
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_host;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_host check (
  endpoint ~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.apple\.com)/'
) not valid;

-- An 11th device replaces the oldest one.
create or replace function private.cap_push_subscriptions() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  delete from public.push_subscriptions s
   where s.user_id = new.user_id
     and s.id in (select o.id from public.push_subscriptions o where o.user_id = new.user_id order by o.created_at desc offset 9);
  return new;
end;
$$;
drop trigger if exists push_subscriptions_cap on public.push_subscriptions;
create trigger push_subscriptions_cap before insert on public.push_subscriptions for each row execute function private.cap_push_subscriptions();

-- ---------------------------------------------------------------------------------------------
-- 6. Mentions: ignore @names inside links, and @words longer than a handle can be.
-- ---------------------------------------------------------------------------------------------
create or replace function private.notify_mentions() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare h text; target uuid; n int := 0;
begin
  for h in
    select distinct lower(m[1])
      from regexp_matches(
             regexp_replace(new.body, '(https?://|www\.)\S+', ' ', 'gi'),
             '(?:^|[^A-Za-z0-9_&/])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])', 'g') as m
  loop
    exit when n >= 10;
    select id into target from public.profiles where handle = h;
    if target is not null and target <> new.author_id and not private.is_blocked(target, new.author_id) then
      insert into public.notifications (user_id, actor_id, type, post_id) values (target, new.author_id, 'mention', new.id);
      n := n + 1;
    end if;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 7. Messages.
-- ---------------------------------------------------------------------------------------------

-- A direct chat keeps the age group it was started in ("teen" or "adult"), and only people in
-- that group can send in it. Two teens who had a chat and have both turned 18 were locked out of
-- it for good. Opening the chat again (the Message button) now moves it to their current group.
-- Unchanged otherwise.
create or replace function public.start_direct(other uuid) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare me uuid := auth.uid(); band text; k text; conv uuid;
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if other = me or not exists (select 1 from public.profiles where id = other) then raise exception 'That account isn''t available.' using errcode = 'P0001'; end if;
  band := private.age_band(me);
  if private.age_band(other) <> band then raise exception 'You can''t message this account.' using errcode = 'P0001'; end if;
  if private.is_blocked(me, other) then raise exception 'You can''t message this account.' using errcode = 'P0001'; end if;
  k := least(me::text, other::text) || ':' || greatest(me::text, other::text);
  select id into conv from public.conversations where direct_key = k;
  if conv is null then
    perform private.rate_limit('start_chat', 20, interval '1 hour');
    insert into public.conversations (kind, age_band, direct_key, created_by) values ('direct', band, k, me) returning id into conv;
    insert into public.conversation_members (conversation_id, user_id, role, status) values
      (conv, me, 'member', 'active'),
      (conv, other, 'member', case when private.is_mutual(me, other) then 'active' else 'request' end);
  else
    -- Both people are in the same age group now (checked above): the chat follows them.
    update public.conversations set age_band = band where id = conv and age_band <> band;
    -- Reopening a chat you'd left; the other side's status stays as it was.
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'left';
    update public.conversation_members set status = 'active' where conversation_id = conv and user_id = me and status = 'request';
  end if;
  return conv;
end;
$$;

-- The inbox list. Unchanged except that a direct chat still names the other person after they
-- removed it from their own inbox (it used to read "Deleted account").
create or replace function public.my_conversations()
  returns table(id uuid, kind text, title text, status text, last_message_at timestamptz, last_body text, last_sender uuid, last_has_image boolean, last_deleted boolean, unread integer, members jsonb, can_send boolean, muted boolean)
  language sql stable
  set search_path = ''
as $$
  select c.id, c.kind, c.title, me.status, c.last_message_at,
    lm.body, lm.sender_id, lm.image_path is not null, lm.deleted_at is not null,
    (select count(*)::int from public.messages m where m.conversation_id = c.id and m.created_at > me.last_read_at and m.sender_id is distinct from me.user_id and m.deleted_at is null),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'tag', p.tag, 'handle', p.handle, 'avatar_path', p.avatar_path) order by p.tag)
      from public.conversation_members om join public.profiles p on p.id = om.user_id
      where om.conversation_id = c.id and om.user_id <> me.user_id and (om.status <> 'left' or c.kind = 'direct')
    ), '[]'::jsonb),
    private.can_send(c.id, me.user_id),
    me.muted
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select m.body, m.sender_id, m.image_path, m.deleted_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where me.user_id = auth.uid() and me.status in ('active', 'request')
    and (c.kind = 'group' or lm.sender_id is not null or lm.deleted_at is not null)
  order by c.last_message_at desc
  limit 100;
$$;

-- Reaction changes are no longer sent out by the database's live feed: when a reaction is removed,
-- that feed can't apply the "members only" rule and tells every listener who removed which emoji
-- from which message. The app now tells the chat's members itself, over the chat's private channel.
do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions') then
    alter publication supabase_realtime drop table public.message_reactions;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 8. Housekeeping.
-- ---------------------------------------------------------------------------------------------

-- Without these, deleting a post, a message or a chat has to read whole tables to find what
-- pointed at it.
create index if not exists profiles_pinned_post_idx on public.profiles (pinned_post_id) where pinned_post_id is not null;
create index if not exists post_dismissals_post_idx on public.post_dismissals (post_id);
create index if not exists messages_reply_to_idx on public.messages (reply_to_id) where reply_to_id is not null;
create index if not exists notifications_conversation_idx on public.notifications (conversation_id) where conversation_id is not null;
create index if not exists notifications_highlight_idx on public.notifications (highlight_id) where highlight_id is not null;
create index if not exists notifications_reel_submission_idx on public.notifications (reel_submission_id) where reel_submission_id is not null;

-- Lists a person can write to get a size limit, so they can't be used to fill the database.
alter table public.profiles drop constraint if exists profiles_mains_size;
alter table public.profiles add constraint profiles_mains_size check (pg_column_size(mains) < 2000) not valid;
alter table public.profiles drop constraint if exists profiles_games_count;
alter table public.profiles add constraint profiles_games_count check (cardinality(games) <= 6) not valid;
alter table public.profiles drop constraint if exists profiles_notification_mutes_count;
alter table public.profiles add constraint profiles_notification_mutes_count check (cardinality(notification_mutes) <= 20) not valid;
alter table public.muted_words drop constraint if exists muted_words_size;
alter table public.muted_words add constraint muted_words_size check (pg_column_size(words) < 4000) not valid;
