-- Several brackets in one tournament: an event can have extra brackets under it (a Redemption
-- bracket, a second game, a side event). Each extra bracket is an ordinary hosted event with its own
-- format, players and bracket; `parent_id` ties it to the main event, whose page lists them all.
--
--   parent_id:    the main event this bracket belongs to (empty = an ordinary event, or the main one)
--   bracket_name: the bracket's own short name ("Redemption"). The app keeps the event's `name` as
--                 "<main event>: <bracket name>", so notifications and results read right everywhere.
--
-- The rules, enforced here so they can't be skipped:
--   - only the main event's host can add a bracket to it, and only to an event that isn't itself a bracket
--   - up to 8 extra brackets per event, 20 new brackets a day per person (the 5-a-day limit on new
--     events doesn't count them)
--   - a bracket can start right away (no "10 minutes from now" rule), within a week of its main event
--   - a bracket can't be moved to another event afterwards
--   - co-TOs of the main event run its brackets too
--   - sign-ups for an extra bracket stay open until the host closes them or starts it (they're often
--     made on the day, after the main event began)
-- If the main event's row is ever deleted (today that only happens when the host deletes their
-- account), its brackets go with it.
--
-- Nothing here changes or deletes existing rows: both columns are empty for every existing event.

alter table public.hosted_events add column parent_id uuid references public.hosted_events (id) on delete cascade;
alter table public.hosted_events add column bracket_name text check (bracket_name is null or char_length(btrim(bracket_name)) between 2 and 30);
create index hosted_events_parent_idx on public.hosted_events (parent_id) where parent_id is not null;
-- Set when the bracket is made; the name can be changed later, the event it belongs to can't.
grant insert (parent_id, bracket_name), update (bracket_name) on public.hosted_events to authenticated;

-- New events and edits. Unchanged for ordinary events; extra brackets get their own rules.
create or replace function private.before_hosted_event() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare main record;
begin
  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
    raise exception 'A bracket can''t be moved to another event.' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    if new.parent_id is null then
      perform private.rate_limit('host_event', 5, interval '1 day');
      if new.starts_at < now() + interval '10 minutes' then
        raise exception 'Pick a start time at least 10 minutes from now.' using errcode = 'P0001';
      end if;
    else
      -- An extra bracket. The main event's row is locked so two brackets added at once are counted right.
      select e.host_id, e.parent_id, e.removed_at, e.status, e.starts_at into main
        from public.hosted_events e where e.id = new.parent_id for update;
      if not found or main.host_id is distinct from new.host_id then
        raise exception 'You can only add brackets to your own events.' using errcode = 'P0001';
      end if;
      if main.parent_id is not null then
        raise exception 'Add the bracket to the main event.' using errcode = 'P0001';
      end if;
      if main.removed_at is not null or main.status = 'canceled' then
        raise exception 'That event isn''t available.' using errcode = 'P0001';
      end if;
      if new.bracket_name is null then
        raise exception 'Name the bracket.' using errcode = 'P0001';
      end if;
      if (select count(*) from public.hosted_events c where c.parent_id = new.parent_id) >= 8 then
        raise exception 'An event can have up to 8 extra brackets.' using errcode = 'P0001';
      end if;
      if new.starts_at < main.starts_at - interval '7 days' or new.starts_at > main.starts_at + interval '7 days' then
        raise exception 'A bracket starts within a week of its main event.' using errcode = 'P0001';
      end if;
      new.series_id := null; -- weekly editions are whole events, never one bracket
      perform private.rate_limit('host_bracket', 20, interval '1 day');
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
       or private.has_contact_info(coalesce(new.bracket_name, ''))
       or private.has_contact_info(coalesce(new.description, ''))
       or private.has_contact_info(coalesce(new.location, ''))
       or private.has_contact_info(coalesce(new.region, ''))) then
    raise exception 'Event details can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- The host or a co-TO of this event; for an extra bracket, also a co-TO of its main event.
create or replace function private.runs_event(ev uuid, uid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.hosted_events e
    where e.id = ev
      and (e.host_id = uid
        or exists (select 1 from public.hosted_cohosts c where c.user_id = uid and (c.event_id = e.id or c.event_id = e.parent_id)))
  );
$$;

-- Signing up. Unchanged, except that an extra bracket takes sign-ups until the host closes them or
-- starts it (the "already started" rule goes by the clock, and these are often made on the day).
create or replace function public.join_hosted_event(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into e from public.hosted_events where id = ev for update;
  if e is null or e.removed_at is not null then raise exception 'That event isn''t available.' using errcode = 'P0001'; end if;
  if e.status <> 'open' then raise exception 'Sign-ups are closed.' using errcode = 'P0001'; end if;
  if e.parent_id is null and e.starts_at < now() then raise exception 'This event already started.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = e.host_id and b.blocked_id = uid) or (b.blocker_id = uid and b.blocked_id = e.host_id)) then
    raise exception 'You can''t join this event.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.hosted_entrants where event_id = ev) + (select count(*) from public.hosted_guests where event_id = ev) >= e.entrant_cap then
    raise exception 'This event is full.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('join_event', 30, interval '1 hour');
  insert into public.hosted_entrants (event_id, user_id) values (ev, uid) on conflict do nothing;
end;
$$;

-- Reminders. Unchanged, except that "Starts in 1 hour" for an extra bracket isn't sent to players
-- who are also in the main event (they get the main event's reminder; one is enough).
create or replace function private.notify_hosted_checkins() returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  -- Check-in is open.
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
  select en.user_id, null, 'event_update', left('Check-in is open: ' || e.name || '. Tap to check in', 200), '/host/' || e.id
  from public.hosted_events e
  join public.hosted_entrants en on en.event_id = e.id
  where e.removed_at is null
    and e.status in ('open', 'closed')
    and e.checkin_minutes > 0
    and now() >= e.starts_at - make_interval(mins => e.checkin_minutes)
    and now() < e.starts_at + interval '2 hours'
    and en.checked_in_at is null
    and not exists (
      select 1 from public.notifications n
      where n.user_id = en.user_id and n.type = 'event_update' and n.event_href = '/host/' || e.id
        and n.event_name like 'Check-in is open:%'
    );

  -- No check-in: starts in about an hour.
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
  select en.user_id, null, 'event_update', left('Starts in 1 hour: ' || e.name, 200), '/host/' || e.id
  from public.hosted_events e
  join public.hosted_entrants en on en.event_id = e.id
  where e.removed_at is null
    and e.status in ('open', 'closed')
    and e.checkin_minutes = 0
    and now() >= e.starts_at - interval '60 minutes'
    and now() < e.starts_at
    and (e.parent_id is null or not exists (
      select 1 from public.hosted_entrants main where main.event_id = e.parent_id and main.user_id = en.user_id
    ))
    and not exists (
      select 1 from public.notifications n
      where n.user_id = en.user_id and n.type = 'event_update' and n.event_href = '/host/' || e.id
        and n.event_name like 'Starts in 1 hour:%'
    );
end;
$$;
