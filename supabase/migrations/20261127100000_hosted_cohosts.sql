-- Co-TOs for hosted events: the host adds people who help run the bracket (check people in, add
-- walk-ins, seed, start it, report and fix results). Editing the event, canceling it and managing
-- co-TOs stay with the host.

create table public.hosted_cohosts (
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index hosted_cohosts_user_idx on public.hosted_cohosts (user_id);

alter table public.hosted_cohosts enable row level security;
revoke all on public.hosted_cohosts from anon, authenticated;
grant select on public.hosted_cohosts to anon, authenticated;
create policy "Co-TOs are public" on public.hosted_cohosts for select using (true);

-- The host or a co-TO of this event.
create function private.runs_event(ev uuid, uid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.hosted_events where id = ev and host_id = uid)
      or exists (select 1 from public.hosted_cohosts where event_id = ev and user_id = uid);
$$;
revoke all on function private.runs_event(uuid, uuid) from public;

-- ---------- Managing co-TOs (host only) ----------
create function public.host_add_cohost(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record;
begin
  select * into e from public.hosted_events where id = ev;
  if e is null or e.host_id <> auth.uid() or e.removed_at is not null then
    raise exception 'Only the host can add co-TOs.' using errcode = 'P0001';
  end if;
  if person = e.host_id then raise exception 'You''re already the host.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = person) then
    raise exception 'We couldn''t find that player.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = e.host_id and b.blocked_id = person) or (b.blocker_id = person and b.blocked_id = e.host_id)) then
    raise exception 'You can''t add that player.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.hosted_cohosts where event_id = ev) >= 5 then
    raise exception 'Up to 5 co-TOs per event.' using errcode = 'P0001';
  end if;
  insert into public.hosted_cohosts (event_id, user_id) values (ev, person) on conflict do nothing;
end;
$$;

create function public.host_remove_cohost(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  -- The host removes anyone; a co-TO can step down themselves.
  if not exists (select 1 from public.hosted_events where id = ev and host_id = auth.uid()) and person <> auth.uid() then
    raise exception 'Only the host can remove co-TOs.' using errcode = 'P0001';
  end if;
  delete from public.hosted_cohosts where event_id = ev and user_id = person;
end;
$$;

-- ---------- Running the event: host or co-TO ----------
create or replace function public.host_add_guest(ev uuid, guest_tag text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare e record; t text := btrim(coalesce(guest_tag, '')); gid uuid;
begin
  select * into e from public.hosted_events where id = ev for update;
  if e is null or not private.runs_event(ev, auth.uid()) or e.status not in ('open', 'closed') then
    raise exception 'Only the host can add players, before the bracket starts.' using errcode = 'P0001';
  end if;
  if char_length(t) < 1 or char_length(t) > 30 then
    raise exception 'Tags are 1–30 characters.' using errcode = 'P0001';
  end if;
  if (private.is_minor(e.host_id) or private.is_minor(auth.uid())) and private.has_contact_info(t) then
    raise exception 'Tags can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.hosted_entrants where event_id = ev) + (select count(*) from public.hosted_guests where event_id = ev) >= e.entrant_cap then
    raise exception 'This event is full.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.hosted_guests where event_id = ev and lower(btrim(tag)) = lower(t)) then
    raise exception 'There''s already a walk-in called %.', t using errcode = 'P0001';
  end if;
  perform private.rate_limit('host_add_guest', 300, interval '1 day');
  insert into public.hosted_guests (event_id, tag, checked_in_at) values (ev, t, now()) returning id into gid;
  return gid;
end;
$$;

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
end;
$$;

create or replace function public.host_set_seeds(ev uuid, ordered uuid[]) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not private.runs_event(ev, auth.uid()) or not exists (select 1 from public.hosted_events where id = ev and status in ('open', 'closed')) then
    raise exception 'Only the host can seed, before the bracket starts.' using errcode = 'P0001';
  end if;
  update public.hosted_entrants en set seed = s.n
  from unnest(ordered) with ordinality as s(person, n)
  where en.event_id = ev and en.user_id = s.person;
  update public.hosted_guests g set seed = s.n
  from unnest(ordered) with ordinality as s(person, n)
  where g.event_id = ev and g.id = s.person;
end;
$$;

create or replace function public.host_check_in(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not private.runs_event(ev, auth.uid()) or not exists (select 1 from public.hosted_events where id = ev and status in ('open', 'closed')) then
    raise exception 'Only the host can check people in, before the bracket starts.' using errcode = 'P0001';
  end if;
  update public.hosted_entrants set checked_in_at = coalesce(checked_in_at, now()) where event_id = ev and user_id = person;
  update public.hosted_guests set checked_in_at = coalesce(checked_in_at, now()) where event_id = ev and id = person;
end;
$$;

revoke all on function public.host_add_cohost(uuid, uuid), public.host_remove_cohost(uuid, uuid) from public, anon;
grant execute on function public.host_add_cohost(uuid, uuid), public.host_remove_cohost(uuid, uuid) to authenticated;
