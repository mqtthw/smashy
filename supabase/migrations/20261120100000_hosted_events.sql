-- Hosted events, phase 1 (additive): anyone signed in can host an event on Smashy and take sign-ups,
-- with check-in and seeding. Brackets and live sets come in later phases (see docs/hosted-events-plan.md).

create table public.hosted_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  online boolean not null default true,
  location text check (location is null or char_length(btrim(location)) between 2 and 120), -- in-person venue / city
  region text check (region is null or char_length(region) <= 40), -- online: who it's for, e.g. "North America"
  starts_at timestamptz not null,
  timezone text not null default 'America/Chicago' check (char_length(timezone) <= 60),
  format text not null default 'double_elim' check (format in ('double_elim', 'single_elim', 'round_robin')),
  ruleset_id uuid references public.rulesets (id) on delete set null,
  best_of int not null default 3 check (best_of between 1 and 9),
  best_of_top int check (best_of_top is null or best_of_top between 1 and 9),
  entrant_cap int not null default 64 check (entrant_cap between 2 and 512),
  checkin_minutes int not null default 30 check (checkin_minutes between 0 and 240), -- 0 = no check-in
  description text check (description is null or char_length(description) <= 2000),
  status text not null default 'open' check (status in ('open', 'closed', 'in_progress', 'completed', 'canceled')),
  removed_at timestamptz, -- hidden by moderators
  removed_reason text,
  created_at timestamptz not null default now()
);
create index hosted_events_upcoming_idx on public.hosted_events (starts_at) where removed_at is null and status in ('open', 'closed');
create index hosted_events_host_idx on public.hosted_events (host_id, created_at desc);

create table public.hosted_entrants (
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seed int check (seed is null or seed between 1 and 512),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index hosted_entrants_user_idx on public.hosted_entrants (user_id, created_at desc);

alter table public.hosted_events enable row level security;
alter table public.hosted_entrants enable row level security;
revoke all on public.hosted_events, public.hosted_entrants from anon, authenticated;

-- Everyone can see events (except removed ones, which only the host still sees) and who signed up
-- (profiles' own privacy rules still hide teens from guests).
grant select on public.hosted_events, public.hosted_entrants to anon, authenticated;
create policy "Events are public" on public.hosted_events for select
  using (removed_at is null or host_id = (select auth.uid()));
create policy "Entrants are public" on public.hosted_entrants for select using (true);

-- Hosts create and edit their own events (only these columns); everything about entrants goes
-- through the functions below so the rules can't be skipped.
grant insert (host_id, name, game, online, location, region, starts_at, timezone, format, ruleset_id, best_of, best_of_top, entrant_cap, checkin_minutes, description)
  on public.hosted_events to authenticated;
grant update (name, online, location, region, starts_at, timezone, format, ruleset_id, best_of, best_of_top, entrant_cap, checkin_minutes, description, status)
  on public.hosted_events to authenticated;
create policy "Hosts create their own events" on public.hosted_events for insert to authenticated
  with check (host_id = (select auth.uid()));
create policy "Hosts edit their own events" on public.hosted_events for update to authenticated
  using (host_id = (select auth.uid()) and removed_at is null) with check (host_id = (select auth.uid()));

-- New events: a few per day per person, start in the future, and teens' text gets the contact check.
create function private.before_hosted_event() returns trigger
  language plpgsql security definer set search_path = ''
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
  if private.is_minor(new.host_id) and (private.has_contact_info(new.name) or private.has_contact_info(coalesce(new.description, '')) or private.has_contact_info(coalesce(new.location, ''))) then
    raise exception 'Event details can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger hosted_events_before before insert or update on public.hosted_events
  for each row execute function private.before_hosted_event();

-- ---------- Entrant actions ----------
create function public.join_hosted_event(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into e from public.hosted_events where id = ev for update;
  if e is null or e.removed_at is not null then raise exception 'That event isn''t available.' using errcode = 'P0001'; end if;
  if e.status <> 'open' then raise exception 'Sign-ups are closed.' using errcode = 'P0001'; end if;
  if e.starts_at < now() then raise exception 'This event already started.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = e.host_id and b.blocked_id = uid) or (b.blocker_id = uid and b.blocked_id = e.host_id)) then
    raise exception 'You can''t join this event.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.hosted_entrants where event_id = ev) >= e.entrant_cap then
    raise exception 'This event is full.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('join_event', 30, interval '1 hour');
  insert into public.hosted_entrants (event_id, user_id) values (ev, uid) on conflict do nothing;
end;
$$;

create function public.leave_hosted_event(ev uuid) returns void
  language sql security definer set search_path = ''
as $$
  delete from public.hosted_entrants en
  using public.hosted_events e
  where en.event_id = ev and en.user_id = auth.uid() and e.id = en.event_id and e.status in ('open', 'closed');
$$;

-- Check in during the window before the start (or any time before start if the host turned check-in off).
create function public.check_in_hosted_event(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record;
begin
  select * into e from public.hosted_events where id = ev;
  if e is null or e.status not in ('open', 'closed') then raise exception 'Check-in isn''t open.' using errcode = 'P0001'; end if;
  if e.checkin_minutes > 0 and now() < e.starts_at - make_interval(mins => e.checkin_minutes) then
    raise exception 'Check-in opens % minutes before the start.', e.checkin_minutes using errcode = 'P0001';
  end if;
  update public.hosted_entrants set checked_in_at = now() where event_id = ev and user_id = auth.uid() and checked_in_at is null;
end;
$$;

-- Host tools: remove someone, and set the seeding (an ordered list of entrants: seed 1 first).
create function public.host_remove_entrant(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.hosted_events where id = ev and host_id = auth.uid()) then
    raise exception 'Only the host can do that.' using errcode = 'P0001';
  end if;
  delete from public.hosted_entrants where event_id = ev and user_id = person;
end;
$$;

create function public.host_set_seeds(ev uuid, ordered uuid[]) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.hosted_events where id = ev and host_id = auth.uid() and status in ('open', 'closed')) then
    raise exception 'Only the host can seed, before the bracket starts.' using errcode = 'P0001';
  end if;
  update public.hosted_entrants en set seed = s.n
  from unnest(ordered) with ordinality as s(person, n)
  where en.event_id = ev and en.user_id = s.person;
end;
$$;

revoke all on function public.join_hosted_event(uuid), public.leave_hosted_event(uuid), public.check_in_hosted_event(uuid),
  public.host_remove_entrant(uuid, uuid), public.host_set_seeds(uuid, uuid[]) from public, anon;
grant execute on function public.join_hosted_event(uuid), public.leave_hosted_event(uuid), public.check_in_hosted_event(uuid),
  public.host_remove_entrant(uuid, uuid), public.host_set_seeds(uuid, uuid[]) to authenticated;

-- Events can be reported like other content.
alter table public.live_reports drop constraint live_reports_kind_check;
alter table public.live_reports add constraint live_reports_kind_check check (kind in ('chat', 'lobby', 'highlight', 'reel', 'message', 'profile', 'event'));
