-- "I want to play now" (round 398, Matthew's netplay proposal).
--
-- play_settings: one row per player. Which games' @matchmaking pings they want, their "Looking to play"
--   switch (it turns itself off at looking_until), and when they last sent a ping (server-managed).
-- play_codes: a saved netplay code per game. Only its owner can read it; the other player in an
--   accepted play request gets it through public.play_request_codes().
-- play_requests: "X wants to play Melee now". Made and answered only through the functions below,
--   so the rules live here: same age band (like messages), no blocks, 15 minutes to answer, one open
--   request per pair, 10 an hour.
-- @matchmaking: a chat message in a game's room that tags @matchmaking notifies everyone who turned
--   pings on for that game. Once per 30 minutes per sender; nobody gets more than one ping per 10 minutes.
-- Three new notification types (play_ping, play_request, play_accepted), pushed to phones.
--
-- New tables and functions; the only existing things changed are the notification type list, the push
-- trigger's list and a new trigger on chat_messages.

create or replace function private.is_play_game(g text) returns boolean
  language sql immutable set search_path = ''
as $$ select g in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4'); $$;

-- ---------- Settings ----------
create table public.play_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  ping_games text[] not null default '{}' check (
    cardinality(ping_games) <= 6
    and ping_games <@ array['melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4']::text[]
  ),
  looking_game text check (looking_game is null or private.is_play_game(looking_game)),
  looking_until timestamptz, -- kept to at most 3 hours ahead by the trigger below
  last_ping_at timestamptz,
  updated_at timestamptz not null default now()
);
create index play_settings_ping_idx on public.play_settings using gin (ping_games);

create function private.before_play_settings() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.looking_until > now() + interval '3 hours' then new.looking_until := now() + interval '3 hours'; end if;
  if new.looking_until is not null and new.looking_game is null then new.looking_until := null; end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger play_settings_before_write before insert or update on public.play_settings
  for each row execute function private.before_play_settings();

alter table public.play_settings enable row level security;
revoke all on public.play_settings from anon, authenticated;
grant select on public.play_settings to authenticated;
grant insert (user_id, ping_games, looking_game, looking_until) on public.play_settings to authenticated;
grant update (ping_games, looking_game, looking_until, updated_at) on public.play_settings to authenticated;
create policy "Own play settings" on public.play_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- Saved codes ----------
create table public.play_codes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (private.is_play_game(game)),
  code text not null check (
    code ~ '^[A-Za-z0-9#: /-]{2,40}$'
    and (code ~* '^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$' or not private.has_contact_info(code))
  ),
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);
alter table public.play_codes enable row level security;
revoke all on public.play_codes from anon, authenticated;
grant select, delete on public.play_codes to authenticated;
grant insert (user_id, game, code) on public.play_codes to authenticated;
grant update (code, updated_at) on public.play_codes to authenticated;
create policy "Own play codes" on public.play_codes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- Play requests ----------
create table public.play_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (private.is_play_game(game)),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  answered_at timestamptz,
  check (from_id <> to_id)
);
create index play_requests_to_idx on public.play_requests (to_id, created_at desc);
create index play_requests_from_idx on public.play_requests (from_id, created_at desc);

alter table public.play_requests enable row level security;
revoke all on public.play_requests from anon, authenticated;
grant select on public.play_requests to authenticated;
create policy "Both players see a play request" on public.play_requests for select to authenticated
  using ((from_id = (select auth.uid()) or to_id = (select auth.uid())) and not private.is_blocked(from_id, to_id));

-- Live updates for the two players (Realtime follows the select rule).
alter publication supabase_realtime add table public.play_requests;

-- ---------- Notification types ----------
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder', 'weekly_digest', 'set_ready', 'event_result',
  'event_update', 'ladder_match', 'play_ping', 'play_request', 'play_accepted'
));
create or replace function private.push_notification() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.type in ('reply', 'mention', 'quote', 'follow', 'follow_request', 'follow_accepted', 'message_request', 'major_live', 'event_reminder', 'set_ready', 'event_result', 'event_update', 'ladder_match', 'play_ping', 'play_request', 'play_accepted') then
    perform private.request_push('notification', new.id);
  end if;
  return null;
end;
$$;

-- ---------- Asking, answering, cancelling ----------
-- event_name holds the game key (the site shows the game's name); event_href opens the Play tab.
create function public.ask_to_play(p_to uuid, p_game text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  rid uuid;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'Finish joining first.' using errcode = '42501'; end if;
  if not private.is_play_game(p_game) then raise exception 'Pick a game.' using errcode = '22023'; end if;
  if p_to = uid then raise exception 'That''s you.' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_to)
     or private.is_blocked(uid, p_to)
     or private.age_band(uid) <> private.age_band(p_to) then
    raise exception 'You can''t ask this player.' using errcode = 'P0403';
  end if;
  if exists (select 1 from public.play_requests where from_id = uid and to_id = p_to and status = 'pending' and expires_at > now()) then
    raise exception 'You already asked. Give them a few minutes.' using errcode = 'P0409';
  end if;
  if (select count(*) from public.play_requests where from_id = uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many requests. Try again later.' using errcode = 'P0429';
  end if;
  insert into public.play_requests (from_id, to_id, game) values (uid, p_to, p_game) returning id into rid;
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
    values (p_to, uid, 'play_request', p_game, '/play?room=' || p_game || '#requests');
  return rid;
end;
$$;

create function public.answer_play_request(p_id uuid, p_accept boolean) returns text
  language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.play_requests;
begin
  select * into r from public.play_requests where id = p_id and to_id = uid for update;
  if r.id is null or private.is_blocked(r.from_id, r.to_id) then raise exception 'Request not found.' using errcode = 'P0002'; end if;
  if r.status <> 'pending' or r.expires_at <= now() then raise exception 'This request has ended.' using errcode = 'P0409'; end if;
  update public.play_requests set status = case when p_accept then 'accepted' else 'declined' end, answered_at = now() where id = p_id;
  if p_accept then
    insert into public.notifications (user_id, actor_id, type, event_name, event_href)
      values (r.from_id, uid, 'play_accepted', r.game, '/play?room=' || r.game || '#requests');
  end if;
  return case when p_accept then 'accepted' else 'declined' end;
end;
$$;

create function public.cancel_play_request(p_id uuid) returns void
  language sql security definer set search_path = ''
as $$
  update public.play_requests set status = 'cancelled', answered_at = now()
    where id = p_id and from_id = (select auth.uid()) and status = 'pending';
$$;

-- Both players' saved codes for an accepted request (for 3 hours after it was accepted).
create function public.play_request_codes(p_id uuid) returns table (from_code text, to_code text)
  language sql stable security definer set search_path = ''
as $$
  select
    (select c.code from public.play_codes c where c.user_id = r.from_id and c.game = r.game),
    (select c.code from public.play_codes c where c.user_id = r.to_id and c.game = r.game)
  from public.play_requests r
  where r.id = p_id and r.status = 'accepted' and r.answered_at > now() - interval '3 hours'
    and (select auth.uid()) in (r.from_id, r.to_id)
    and not private.is_blocked(r.from_id, r.to_id);
$$;

-- People you follow who follow you back (same age band, no blocks), with their "Looking to play"
-- switch when it's on. Up to 100, the ones looking first.
create function public.play_friends() returns table (
  id uuid, tag text, handle text, avatar_path text, looking_game text, looking_until timestamptz
)
  language sql stable security definer set search_path = ''
as $$
  select p.id, p.tag, p.handle, p.avatar_path,
    case when s.looking_until > now() then s.looking_game end,
    case when s.looking_until > now() then s.looking_until end
  from public.follows a
  join public.follows b on b.follower_id = a.followee_id and b.followee_id = a.follower_id and b.status = 'active'
  join public.profiles p on p.id = a.followee_id
  left join public.play_settings s on s.user_id = p.id
  where a.follower_id = (select auth.uid()) and a.status = 'active'
    and not private.is_blocked(a.follower_id, p.id)
    and private.age_band(a.follower_id) = private.age_band(p.id)
  order by (s.looking_until > now()) is true desc, p.tag
  limit 100;
$$;

revoke all on function public.ask_to_play(uuid, text), public.answer_play_request(uuid, boolean),
  public.cancel_play_request(uuid), public.play_request_codes(uuid), public.play_friends() from public, anon;
grant execute on function public.ask_to_play(uuid, text), public.answer_play_request(uuid, boolean),
  public.cancel_play_request(uuid), public.play_request_codes(uuid), public.play_friends() to authenticated;
revoke all on function private.is_play_game(text) from public;
grant execute on function private.is_play_game(text) to anon, authenticated;

-- ---------- @matchmaking ----------
create function private.after_chat_matchmaking() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  band text;
begin
  if new.room = 'general' or new.body !~* '(^|[^A-Za-z0-9_])@matchmaking([^A-Za-z0-9_]|$)' then return null; end if;
  -- One ping per sender per 30 minutes (the message itself still posts).
  insert into public.play_settings (user_id, last_ping_at) values (new.author_id, now())
    on conflict (user_id) do update set last_ping_at = now()
    where play_settings.last_ping_at is null or play_settings.last_ping_at < now() - interval '30 minutes';
  if not found then return null; end if;
  band := private.age_band(new.author_id);
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
    select s.user_id, new.author_id, 'play_ping', new.room, '/play?room=' || new.room
    from public.play_settings s
    where new.room = any (s.ping_games)
      and s.user_id <> new.author_id
      and not private.is_blocked(s.user_id, new.author_id)
      and private.age_band(s.user_id) = band
      and not exists (select 1 from public.notifications n
                      where n.user_id = s.user_id and n.type = 'play_ping' and n.created_at > now() - interval '10 minutes')
    limit 300;
  return null;
end;
$$;
create trigger chat_after_insert_matchmaking after insert on public.chat_messages
  for each row execute function private.after_chat_matchmaking();
