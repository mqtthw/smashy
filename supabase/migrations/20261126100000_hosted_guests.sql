-- Walk-in players for hosted events: the host adds someone who doesn't have a Smashy account (most
-- locals have a few every week). A guest is just a tag in one event, with the same seed / check-in /
-- placement as a signed-up entrant. Bracket sets hold either kind of id (guest ids are uuids too).

create table public.hosted_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  tag text not null check (char_length(btrim(tag)) between 1 and 30),
  seed int check (seed is null or seed between 1 and 512),
  checked_in_at timestamptz,
  placement int check (placement is null or placement between 1 and 512),
  created_at timestamptz not null default now()
);
create index hosted_guests_event_idx on public.hosted_guests (event_id, created_at);
create unique index hosted_guests_tag_idx on public.hosted_guests (event_id, lower(btrim(tag)));

alter table public.hosted_guests enable row level security;
revoke all on public.hosted_guests from anon, authenticated;
grant select on public.hosted_guests to anon, authenticated;
create policy "Guests are public" on public.hosted_guests for select using (true);

-- Sets point at a profile or a guest, so the profile-only foreign keys go. (A deleted account's
-- sets keep its id and show as "Player", like a hidden profile already does.)
alter table public.hosted_sets drop constraint if exists hosted_sets_p1_id_fkey;
alter table public.hosted_sets drop constraint if exists hosted_sets_p2_id_fkey;

-- ---------- Host tools ----------

-- Add a walk-in (before the bracket starts). Returns the guest's id.
create function public.host_add_guest(ev uuid, guest_tag text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare e record; t text := btrim(coalesce(guest_tag, '')); gid uuid;
begin
  select * into e from public.hosted_events where id = ev for update;
  if e is null or e.host_id <> auth.uid() or e.status not in ('open', 'closed') then
    raise exception 'Only the host can add players, before the bracket starts.' using errcode = 'P0001';
  end if;
  if char_length(t) < 1 or char_length(t) > 30 then
    raise exception 'Tags are 1–30 characters.' using errcode = 'P0001';
  end if;
  if private.is_minor(e.host_id) and private.has_contact_info(t) then
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

-- Removing someone: a signed-up entrant or a walk-in.
create or replace function public.host_remove_entrant(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.hosted_events where id = ev and host_id = auth.uid()) then
    raise exception 'Only the host can do that.' using errcode = 'P0001';
  end if;
  delete from public.hosted_entrants where event_id = ev and user_id = person;
  delete from public.hosted_guests where event_id = ev and id = person
    and exists (select 1 from public.hosted_events where id = ev and status in ('open', 'closed'));
end;
$$;

-- Seeding covers walk-ins too.
create or replace function public.host_set_seeds(ev uuid, ordered uuid[]) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.hosted_events where id = ev and host_id = auth.uid() and status in ('open', 'closed')) then
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

-- Host check-in works for walk-ins too (they're checked in when added; this covers un-checking flows later).
create or replace function public.host_check_in(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.hosted_events where id = ev and host_id = auth.uid() and status in ('open', 'closed')) then
    raise exception 'Only the host can check people in, before the bracket starts.' using errcode = 'P0001';
  end if;
  update public.hosted_entrants set checked_in_at = coalesce(checked_in_at, now()) where event_id = ev and user_id = person;
  update public.hosted_guests set checked_in_at = coalesce(checked_in_at, now()) where event_id = ev and id = person;
end;
$$;

-- The cap counts walk-ins.
create or replace function public.join_hosted_event(ev uuid) returns void
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
  if (select count(*) from public.hosted_entrants where event_id = ev) + (select count(*) from public.hosted_guests where event_id = ev) >= e.entrant_cap then
    raise exception 'This event is full.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('join_event', 30, interval '1 hour');
  insert into public.hosted_entrants (event_id, user_id) values (ev, uid) on conflict do nothing;
end;
$$;

revoke all on function public.host_add_guest(uuid, text) from public, anon;
grant execute on function public.host_add_guest(uuid, text) to authenticated;
