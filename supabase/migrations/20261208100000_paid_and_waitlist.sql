-- Two things venues ask for (locals plan L5 and L7):
--
-- 1. WHO HAS PAID. A tick per entry that only the people running the event see. Smashy never
--    handles money: this is the TO's own checklist for the venue fee or entry fee.
--    hosted_paid has one row per entry marked as paid. Nobody reads or writes it directly (no access
--    for members at all): the site reads and writes it on the server, after checking that the
--    person runs the event.
--
-- 2. A WAITLIST. When a singles event is full, players can join a line. When a spot opens (someone
--    withdraws, the host removes someone, or the host raises the cap), the first in line is moved
--    into the event and told. The line is public, like the list of players.
--
-- The rules, enforced here so they can't be skipped:
--   - you can only wait for an event that is full, taking sign-ups, and that you could join
--     (same block and "already started" rules as signing up); up to 200 people can wait
--   - moving up happens in the database, in the same step as the spot opening, in the order
--     people joined the line
--   - doubles events have no waitlist yet (a team is two people)
--
-- Nothing here changes or deletes existing rows.

-- ---------- 1. Who has paid ----------
create table public.hosted_paid (
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  entry_id uuid not null, -- a signed-up player's account id, or a walk-in's or team's id
  marked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, entry_id)
);
alter table public.hosted_paid enable row level security;
revoke all on public.hosted_paid from anon, authenticated;
-- No policies on purpose: only the server (after checking who's asking) touches this table.

-- ---------- 2. The waitlist ----------
create table public.hosted_waitlist (
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index hosted_waitlist_order_idx on public.hosted_waitlist (event_id, created_at);
create index hosted_waitlist_user_idx on public.hosted_waitlist (user_id);

alter table public.hosted_waitlist enable row level security;
revoke all on public.hosted_waitlist from anon, authenticated;
grant select on public.hosted_waitlist to anon, authenticated;
-- Who's waiting is as public as who's in (profiles' own rules still hide teens from guests).
create policy "The waitlist is public" on public.hosted_waitlist for select using (true);

-- Join the line for a full event.
create function public.join_hosted_waitlist(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into e from public.hosted_events where id = ev for update;
  if e is null or e.removed_at is not null then raise exception 'That event isn''t available.' using errcode = 'P0001'; end if;
  if e.team_size <> 1 then raise exception 'Doubles events don''t have a waitlist yet.' using errcode = 'P0001'; end if;
  if e.status <> 'open' then raise exception 'Sign-ups are closed.' using errcode = 'P0001'; end if;
  if e.parent_id is null and e.starts_at < now() then raise exception 'This event already started.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = e.host_id and b.blocked_id = uid) or (b.blocker_id = uid and b.blocked_id = e.host_id)) then
    raise exception 'You can''t join this event.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.hosted_entrants where event_id = ev and user_id = uid) then
    raise exception 'You''re already in this event.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.hosted_entrants where event_id = ev) + (select count(*) from public.hosted_guests where event_id = ev) < e.entrant_cap then
    raise exception 'There''s room: sign up instead.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.hosted_waitlist where event_id = ev) >= 200 then
    raise exception 'The waitlist is full too.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('join_event', 30, interval '1 hour');
  insert into public.hosted_waitlist (event_id, user_id) values (ev, uid) on conflict do nothing;
end;
$$;

create function public.leave_hosted_waitlist(ev uuid) returns void
  language sql security definer set search_path = ''
as $$
  delete from public.hosted_waitlist where event_id = ev and user_id = auth.uid();
$$;

-- A spot may have opened: move people up from the front of the line while there's room. Each one
-- is signed up and told. Someone the host has blocked since (or who blocked the host) is taken out
-- of the line instead. Only before the bracket starts.
create function private.promote_waitlist(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record; next_up uuid;
begin
  select * into e from public.hosted_events where id = ev for update;
  if e is null or e.removed_at is not null or e.status not in ('open', 'closed') or e.team_size <> 1 then return; end if;
  loop
    exit when (select count(*) from public.hosted_entrants where event_id = ev) + (select count(*) from public.hosted_guests where event_id = ev) >= e.entrant_cap;
    select w.user_id into next_up from public.hosted_waitlist w where w.event_id = ev order by w.created_at, w.user_id limit 1;
    exit when next_up is null;
    delete from public.hosted_waitlist where event_id = ev and user_id = next_up;
    if exists (select 1 from public.blocks b where (b.blocker_id = e.host_id and b.blocked_id = next_up) or (b.blocker_id = next_up and b.blocked_id = e.host_id)) then
      continue;
    end if;
    insert into public.hosted_entrants (event_id, user_id) values (ev, next_up) on conflict do nothing;
    insert into public.notifications (user_id, actor_id, type, event_name, event_href)
    values (next_up, null, 'event_update', left('A spot opened up: you''re in ' || e.name || '. Tap to see it, or to withdraw', 200), '/host/' || ev);
  end loop;
end;
$$;
revoke all on function private.promote_waitlist(uuid) from public, anon, authenticated;

revoke all on function public.join_hosted_waitlist(uuid), public.leave_hosted_waitlist(uuid) from public, anon;
grant execute on function public.join_hosted_waitlist(uuid), public.leave_hosted_waitlist(uuid) to authenticated;

-- ---------- A spot opens: withdrawing, being removed, a higher cap ----------

-- Withdrawing. Unchanged, except that the first person waiting takes the spot.
create or replace function public.leave_hosted_event(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.hosted_entrants en
  using public.hosted_events e
  where en.event_id = ev and en.user_id = auth.uid() and e.id = en.event_id and e.status in ('open', 'closed');
  if found then perform private.promote_waitlist(ev); end if;
end;
$$;

-- The host or a co-TO removes someone. Unchanged, except that the first person waiting takes the spot.
create or replace function public.host_remove_entrant(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not private.runs_event(ev, auth.uid()) then
    raise exception 'Only the host can do that.' using errcode = 'P0001';
  end if;
  delete from public.hosted_entrants where event_id = ev and user_id = person;
  delete from public.hosted_guests where event_id = ev and id = person
    and exists (select 1 from public.hosted_events where id = ev and status in ('open', 'closed'));
  delete from public.hosted_paid where event_id = ev and entry_id = person;
  perform private.promote_waitlist(ev);
end;
$$;

-- The host raises the cap: the people waiting who now fit are moved in.
create function private.after_hosted_cap_raised() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  perform private.promote_waitlist(new.id);
  return null;
end;
$$;
create trigger hosted_events_cap_raised after update of entrant_cap on public.hosted_events
  for each row when (new.entrant_cap > old.entrant_cap) execute function private.after_hosted_cap_raised();
