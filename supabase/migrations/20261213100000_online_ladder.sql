-- Online ladder: ranked netplay for members, one ladder per game, in 3-month seasons.
--
-- A member taps "Find a match" for a game with their netplay code. If someone else is waiting for that
-- game, the two are paired (people in the same region first) and the one who was waiting gets a
-- "your ladder match is ready" alert; otherwise they wait in the queue for 30 minutes. They play a best
-- of 3, one reports the score, the other confirms it (or says it's wrong), and both ratings move: Elo,
-- starting at 1000, 32 points at stake. A reported score nobody answers is confirmed after 24 hours;
-- a match nobody reports, or a disputed one, ends after 24 hours without counting. The same two people
-- count at most twice in 24 hours, so a ladder can't be farmed.
--
-- The queue and matches are closed to direct reads and writes: members act through the functions
-- below (checked against their own sign-in), and the site shows a match only to its two players.
-- Standings (ladder_ratings) are public, like any leaderboard.
--
-- Also: a new alert type, 'ladder_match', sent as a push notification like "you're up".
-- Nothing here changes or deletes existing rows.

create table public.ladder_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  game text not null check (game in ('melee', 'ultimate', 'pplus')),
  region text check (region is null or region ~ '^[A-Z]{2}(-[A-Z]{2})?$'),
  connect_info text not null check (
    connect_info ~ '^[A-Za-z0-9#: /-]{2,40}$'
    and (connect_info ~* '^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$' or not private.has_contact_info(connect_info))
  ),
  joined_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);
create index ladder_queue_game_idx on public.ladder_queue (game, joined_at);

create table public.ladder_matches (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('melee', 'ultimate', 'pplus')),
  season text not null check (season ~ '^\d{4}-Q[1-4]$'),
  p1 uuid not null references public.profiles (id) on delete cascade, -- the one who was waiting
  p2 uuid not null references public.profiles (id) on delete cascade,
  p1_connect text not null check (char_length(p1_connect) <= 40),
  p2_connect text not null check (char_length(p2_connect) <= 40),
  status text not null default 'playing' check (status in ('playing', 'reported', 'disputed', 'confirmed', 'cancelled', 'expired')),
  p1_score smallint check (p1_score between 0 and 2),
  p2_score smallint check (p2_score between 0 and 2),
  reported_by uuid references public.profiles (id) on delete set null,
  reported_at timestamptz,
  counted boolean, -- set when confirmed: false when the pair already counted twice in 24 hours
  p1_change integer,
  p2_change integer,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check (p1 <> p2),
  check ((p1_score is null) = (p2_score is null)),
  check (p1_score is null or (greatest(p1_score, p2_score) = 2 and least(p1_score, p2_score) <= 1))
);
create index ladder_matches_p1_idx on public.ladder_matches (p1, created_at desc);
create index ladder_matches_p2_idx on public.ladder_matches (p2, created_at desc);
create index ladder_matches_open_idx on public.ladder_matches (status, created_at) where status in ('playing', 'reported', 'disputed');
create index ladder_matches_reporter_idx on public.ladder_matches (reported_by);

create table public.ladder_ratings (
  season text not null check (season ~ '^\d{4}-Q[1-4]$'),
  game text not null check (game in ('melee', 'ultimate', 'pplus')),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null default 1000,
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  updated_at timestamptz not null default now(),
  primary key (season, game, user_id)
);
create index ladder_ratings_board_idx on public.ladder_ratings (season, game, rating desc);
create index ladder_ratings_user_idx on public.ladder_ratings (user_id);

alter table public.ladder_queue enable row level security;
alter table public.ladder_matches enable row level security;
alter table public.ladder_ratings enable row level security;
revoke all on public.ladder_queue from anon, authenticated;
revoke all on public.ladder_matches from anon, authenticated;
revoke all on public.ladder_ratings from anon, authenticated;
grant select on public.ladder_ratings to anon, authenticated;
create policy "Ladder standings are public" on public.ladder_ratings for select to anon, authenticated using (true);
-- No policies on the queue or matches on purpose: only these functions and the server touch them.

-- The season a moment falls in: 2026-Q4 is October to December 2026 (UTC).
create function private.ladder_season(at timestamptz) returns text
  language sql immutable set search_path = ''
as $$ select to_char(at at time zone 'UTC', 'YYYY') || '-Q' || extract(quarter from at at time zone 'UTC')::int $$;

-- A ladder alert for one player about their match.
create function private.ladder_alert(recipient uuid, actor uuid, match uuid, what text) returns void
  language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
  values (recipient, actor, 'ladder_match', what, '/ladder/match/' || match);
$$;

-- Confirm a reported match: decide whether it counts, then move both ratings. Called with the match
-- already locked.
create function private.ladder_settle(m public.ladder_matches) returns void
  language plpgsql security definer set search_path = ''
as $$
declare r1 integer; r2 integer; expected numeric; change integer; counts boolean; p1_won boolean := m.p1_score > m.p2_score;
begin
  counts := (select count(*) from public.ladder_matches x
             where x.status = 'confirmed' and x.counted and x.ended_at > now() - interval '24 hours'
               and least(x.p1, x.p2) = least(m.p1, m.p2) and greatest(x.p1, x.p2) = greatest(m.p1, m.p2)) < 2;
  if counts then
    insert into public.ladder_ratings (season, game, user_id) values (m.season, m.game, m.p1), (m.season, m.game, m.p2)
      on conflict do nothing;
    select rating into r1 from public.ladder_ratings where season = m.season and game = m.game and user_id = m.p1 for update;
    select rating into r2 from public.ladder_ratings where season = m.season and game = m.game and user_id = m.p2 for update;
    expected := 1 / (1 + power(10::numeric, (r2 - r1) / 400.0));
    change := round(32 * ((case when p1_won then 1 else 0 end) - expected));
    update public.ladder_ratings set rating = rating + change, wins = wins + (case when p1_won then 1 else 0 end),
      losses = losses + (case when p1_won then 0 else 1 end), updated_at = now()
      where season = m.season and game = m.game and user_id = m.p1;
    update public.ladder_ratings set rating = rating - change, wins = wins + (case when p1_won then 0 else 1 end),
      losses = losses + (case when p1_won then 1 else 0 end), updated_at = now()
      where season = m.season and game = m.game and user_id = m.p2;
  end if;
  update public.ladder_matches set status = 'confirmed', counted = counts, ended_at = now(),
    p1_change = case when counts then change end, p2_change = case when counts then -change end
    where id = m.id;
end;
$$;

-- Find a match, or wait for one. Returns the match id when paired (or already in a match), null when waiting.
create function public.ladder_find_match(p_game text, p_connect text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); my_region text; existing uuid; opp public.ladder_queue; mid uuid;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if p_game not in ('melee', 'ultimate', 'pplus') then raise exception 'Pick a game.' using errcode = 'P0001'; end if;
  select id into existing from public.ladder_matches
    where (p1 = uid or p2 = uid) and status in ('playing', 'reported', 'disputed') order by created_at desc limit 1;
  if existing is not null then return existing; end if;
  select region into my_region from public.profiles where id = uid;
  select q.* into opp from public.ladder_queue q
    where q.game = p_game and q.user_id <> uid and q.expires_at > now()
      and not exists (select 1 from public.blocks b where (b.blocker_id = uid and b.blocked_id = q.user_id) or (b.blocker_id = q.user_id and b.blocked_id = uid))
    order by (q.region is not distinct from my_region) desc, q.joined_at
    limit 1 for update skip locked;
  if opp.user_id is null then
    insert into public.ladder_queue (user_id, game, region, connect_info) values (uid, p_game, my_region, p_connect)
      on conflict (user_id) do update set game = excluded.game, region = excluded.region, connect_info = excluded.connect_info,
        joined_at = now(), expires_at = now() + interval '30 minutes';
    return null;
  end if;
  delete from public.ladder_queue where user_id in (uid, opp.user_id);
  insert into public.ladder_matches (game, season, p1, p2, p1_connect, p2_connect)
    values (p_game, private.ladder_season(now()), opp.user_id, uid, opp.connect_info, p_connect)
    returning id into mid;
  perform private.ladder_alert(opp.user_id, uid, mid, 'Your ladder match is ready');
  return mid;
end;
$$;

create function public.ladder_leave_queue() returns void
  language sql security definer set search_path = ''
as $$ delete from public.ladder_queue where user_id = auth.uid() $$;

-- Report the score from your side: your games won and theirs (best of 3: 2-0, 2-1, 1-2 or 0-2).
create function public.ladder_report(p_match uuid, p_mine smallint, p_theirs smallint) returns void
  language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); m public.ladder_matches;
begin
  select * into m from public.ladder_matches where id = p_match for update;
  if m.id is null or uid is null or uid not in (m.p1, m.p2) then raise exception 'That match isn''t yours.' using errcode = 'P0001'; end if;
  if m.status not in ('playing', 'disputed') then raise exception 'This match already has a score.' using errcode = 'P0001'; end if;
  if greatest(p_mine, p_theirs) <> 2 or least(p_mine, p_theirs) not in (0, 1) then raise exception 'A best of 3 ends 2-0 or 2-1.' using errcode = 'P0001'; end if;
  update public.ladder_matches set status = 'reported', reported_by = uid, reported_at = now(),
    p1_score = case when uid = m.p1 then p_mine else p_theirs end,
    p2_score = case when uid = m.p1 then p_theirs else p_mine end
    where id = m.id;
  perform private.ladder_alert(case when uid = m.p1 then m.p2 else m.p1 end, uid, m.id, 'Confirm your ladder score');
end;
$$;

-- The other player answers a reported score: right (it counts) or wrong (disputed: either can report again).
create function public.ladder_answer(p_match uuid, p_agree boolean) returns void
  language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); m public.ladder_matches;
begin
  select * into m from public.ladder_matches where id = p_match for update;
  if m.id is null or uid is null or uid not in (m.p1, m.p2) then raise exception 'That match isn''t yours.' using errcode = 'P0001'; end if;
  if m.status <> 'reported' then raise exception 'There''s no score to answer.' using errcode = 'P0001'; end if;
  if m.reported_by = uid then raise exception 'Your opponent confirms the score you reported.' using errcode = 'P0001'; end if;
  if p_agree then
    perform private.ladder_settle(m);
  else
    update public.ladder_matches set status = 'disputed' where id = m.id;
    perform private.ladder_alert(m.reported_by, uid, m.id, 'Your opponent says that score is wrong');
  end if;
end;
$$;

-- Call off a match before a score is reported (an opponent who never showed, say). It doesn't count.
create function public.ladder_cancel(p_match uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); m public.ladder_matches;
begin
  select * into m from public.ladder_matches where id = p_match for update;
  if m.id is null or uid is null or uid not in (m.p1, m.p2) then raise exception 'That match isn''t yours.' using errcode = 'P0001'; end if;
  if m.status not in ('playing', 'disputed') then raise exception 'This match can''t be called off now.' using errcode = 'P0001'; end if;
  update public.ladder_matches set status = 'cancelled', ended_at = now() where id = m.id;
  perform private.ladder_alert(case when uid = m.p1 then m.p2 else m.p1 end, uid, m.id, 'Your ladder match was called off');
end;
$$;

revoke all on function public.ladder_find_match(text, text), public.ladder_leave_queue(), public.ladder_report(uuid, smallint, smallint),
  public.ladder_answer(uuid, boolean), public.ladder_cancel(uuid) from public, anon;
grant execute on function public.ladder_find_match(text, text), public.ladder_leave_queue(), public.ladder_report(uuid, smallint, smallint),
  public.ladder_answer(uuid, boolean), public.ladder_cancel(uuid) to authenticated;
revoke all on function private.ladder_settle(public.ladder_matches), private.ladder_alert(uuid, uuid, uuid, text) from public, anon, authenticated;

-- Every 10 minutes: confirm scores nobody answered in 24 hours, end matches with no agreed score after
-- 24 hours, and clear old queue entries.
create function private.ladder_tidy() returns void
  language plpgsql security definer set search_path = ''
as $$
declare m public.ladder_matches;
begin
  for m in select * from public.ladder_matches where status = 'reported' and reported_at < now() - interval '24 hours' for update skip locked loop
    perform private.ladder_settle(m);
  end loop;
  update public.ladder_matches set status = 'expired', ended_at = now()
    where status in ('playing', 'disputed') and created_at < now() - interval '24 hours';
  delete from public.ladder_queue where expires_at < now();
end;
$$;
revoke all on function private.ladder_tidy() from public, anon, authenticated;
select cron.schedule('ladder-tidy', '*/10 * * * *', $$select private.ladder_tidy()$$);

-- The new alert type, pushed like "you're up".
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder', 'weekly_digest', 'set_ready', 'event_result',
  'event_update', 'ladder_match'
));
create or replace function private.push_notification() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.type in ('reply', 'mention', 'quote', 'follow', 'follow_request', 'follow_accepted', 'message_request', 'major_live', 'event_reminder', 'set_ready', 'event_result', 'event_update', 'ladder_match') then
    perform private.request_push('notification', new.id);
  end if;
  return null;
end;
$$;
