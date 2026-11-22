-- Doubles: events where the entries are teams of two.
--
-- A team is one entry in the bracket. Brackets already take two kinds of entry: a signed-up account
-- (hosted_entrants) and an entry without an account of its own (hosted_guests: until now only
-- walk-ins, a name the host typed). A team is the second kind: one hosted_guests row named
-- "Mango / Zain", with its seed, check-in and placement, plus two rows in the new
-- hosted_team_members table saying who is on it. A member is a Smashy account (so they see their
-- sets, get told when they're up and can report scores) or just a name (a partner without an account).
-- Everything that works on entries (seeding, the bracket, results, the results file) works unchanged.
--
--   hosted_events.team_size:   1 = singles (every existing event), 2 = doubles. Set when the event
--                              is made and fixed after that, like the game.
--   hosted_guests.members_only: a team with a member under 18 shows only to signed-in people, the
--                              same rule teen profiles already follow.
--
-- The rules, enforced here so they can't be skipped:
--   - in a doubles event you sign up as a team (your account plus a partner: an account or a name);
--     signing up alone, and adding a single walk-in, are refused
--   - one team per person per event; a partner with an account can't be someone who blocked you
--     (or the host), or who is already on a team
--   - either member can check the team in, and either can leave, which removes the team
--   - the host (or a co-TO) can add a team by typing two names
--
-- Nothing here changes or deletes existing rows: every existing event is singles, and every
-- existing walk-in stays public.

alter table public.hosted_events add column team_size int not null default 1 check (team_size in (1, 2));
grant insert (team_size) on public.hosted_events to authenticated;

-- A team's name is two tags of up to 30 characters with " / " between them.
alter table public.hosted_guests drop constraint hosted_guests_tag_check;
alter table public.hosted_guests add constraint hosted_guests_tag_check check (char_length(btrim(tag)) between 1 and 64);
alter table public.hosted_guests add column members_only boolean not null default false;

drop policy "Guests are public" on public.hosted_guests;
create policy "Guests are public; teams with a teen need sign-in" on public.hosted_guests for select
  using (not members_only or (select auth.uid()) is not null);

create table public.hosted_team_members (
  guest_id uuid not null references public.hosted_guests (id) on delete cascade, -- the team
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  user_id uuid references public.profiles (id) on delete set null, -- empty = a partner without an account (or one who deleted theirs)
  name text not null check (char_length(btrim(name)) between 1 and 30), -- their tag when the team was made
  primary key (guest_id, slot)
);
-- One team per person per event.
create unique index hosted_team_members_one_team_idx on public.hosted_team_members (event_id, user_id) where user_id is not null;
create index hosted_team_members_user_idx on public.hosted_team_members (user_id) where user_id is not null;

alter table public.hosted_team_members enable row level security;
revoke all on public.hosted_team_members from anon, authenticated;
grant select on public.hosted_team_members to anon, authenticated;
-- Who is on a team is public like the team itself; everything is written by the functions below.
create policy "Team members are public; teams with a teen need sign-in" on public.hosted_team_members for select
  using ((select auth.uid()) is not null or not exists (select 1 from public.hosted_guests g where g.id = guest_id and g.members_only));

-- ---------- Signing up as a team ----------

-- You and a partner: `partner` is their account, or `partner_name` is typed for someone without one.
-- Returns the team's id.
create function public.join_hosted_team(ev uuid, partner uuid, partner_name text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  e record;
  uid uuid := auth.uid();
  mine text;
  theirs text;
  typed text := btrim(regexp_replace(coalesce(partner_name, ''), '\s+', ' ', 'g'));
  gid uuid;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into e from public.hosted_events where id = ev for update;
  if e is null or e.removed_at is not null then raise exception 'That event isn''t available.' using errcode = 'P0001'; end if;
  if e.team_size <> 2 then raise exception 'This event is singles: sign up on your own.' using errcode = 'P0001'; end if;
  if e.status <> 'open' then raise exception 'Sign-ups are closed.' using errcode = 'P0001'; end if;
  if e.parent_id is null and e.starts_at < now() then raise exception 'This event already started.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = e.host_id and b.blocked_id = uid) or (b.blocker_id = uid and b.blocked_id = e.host_id)) then
    raise exception 'You can''t join this event.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.hosted_team_members m where m.event_id = ev and m.user_id = uid) then
    raise exception 'You''re already on a team in this event.' using errcode = 'P0001';
  end if;
  select p.tag into mine from public.profiles p where p.id = uid;
  if mine is null then raise exception 'Finish setting up your profile first.' using errcode = 'P0001'; end if;

  if partner is not null then
    if partner = uid then raise exception 'Pick someone else as your partner.' using errcode = 'P0001'; end if;
    select p.tag into theirs from public.profiles p where p.id = partner;
    if theirs is null then raise exception 'That player isn''t on Smashy.' using errcode = 'P0001'; end if;
    if exists (
      select 1 from public.blocks b
      where (b.blocker_id = partner and b.blocked_id in (uid, e.host_id)) or (b.blocked_id = partner and b.blocker_id in (uid, e.host_id))
    ) then
      raise exception 'You can''t team up with that player here.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.hosted_team_members m where m.event_id = ev and m.user_id = partner) then
      raise exception '% is already on a team in this event.', theirs using errcode = 'P0001';
    end if;
  else
    if char_length(typed) < 1 or char_length(typed) > 30 then
      raise exception 'Your partner''s name is 1–30 characters.' using errcode = 'P0001';
    end if;
    if private.has_contact_info(typed) then
      raise exception 'Names can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
    end if;
    theirs := typed;
  end if;

  if (select count(*) from public.hosted_entrants where event_id = ev) + (select count(*) from public.hosted_guests where event_id = ev) >= e.entrant_cap then
    raise exception 'This event is full.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('join_event', 30, interval '1 hour');
  begin
    insert into public.hosted_guests (event_id, tag, members_only)
    values (ev, mine || ' / ' || theirs, private.is_minor(uid) or (partner is not null and private.is_minor(partner)))
    returning id into gid;
  exception when unique_violation then
    raise exception 'A team with those names is already signed up.' using errcode = 'P0001';
  end;
  insert into public.hosted_team_members (guest_id, event_id, slot, user_id, name)
  values (gid, ev, 1, uid, mine), (gid, ev, 2, partner, theirs);
  return gid;
end;
$$;

-- Either member leaves, before the bracket starts: the team is removed (a team is two people).
create function public.leave_hosted_team(ev uuid) returns void
  language sql security definer set search_path = ''
as $$
  delete from public.hosted_guests g
  using public.hosted_team_members m, public.hosted_events e
  where m.guest_id = g.id and m.event_id = ev and m.user_id = auth.uid()
    and g.event_id = ev and e.id = ev and e.status in ('open', 'closed');
$$;

-- Either member checks the team in (the same window as checking in to a singles event).
create function public.check_in_hosted_team(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record;
begin
  select * into e from public.hosted_events where id = ev;
  if e is null or e.status not in ('open', 'closed') then raise exception 'Check-in isn''t open.' using errcode = 'P0001'; end if;
  if e.checkin_minutes > 0 and now() < e.starts_at - make_interval(mins => e.checkin_minutes) then
    raise exception 'Check-in opens % minutes before the start.', e.checkin_minutes using errcode = 'P0001';
  end if;
  update public.hosted_guests g set checked_in_at = now()
  from public.hosted_team_members m
  where m.guest_id = g.id and m.event_id = ev and m.user_id = auth.uid() and g.event_id = ev and g.checked_in_at is null;
end;
$$;

-- The host or a co-TO adds a team by typing two names (before the bracket starts). Returns the team's id.
create function public.host_add_team(ev uuid, name1 text, name2 text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  e record;
  a text := btrim(regexp_replace(coalesce(name1, ''), '\s+', ' ', 'g'));
  b text := btrim(regexp_replace(coalesce(name2, ''), '\s+', ' ', 'g'));
  gid uuid;
begin
  select * into e from public.hosted_events where id = ev for update;
  if e is null or not private.runs_event(ev, auth.uid()) or e.status not in ('open', 'closed') then
    raise exception 'Only the host can add teams, before the bracket starts.' using errcode = 'P0001';
  end if;
  if e.team_size <> 2 then raise exception 'This event is singles: add a walk-in instead.' using errcode = 'P0001'; end if;
  if char_length(a) < 1 or char_length(a) > 30 or char_length(b) < 1 or char_length(b) > 30 then
    raise exception 'Each name is 1–30 characters.' using errcode = 'P0001';
  end if;
  if (private.is_minor(e.host_id) or private.is_minor(auth.uid())) and (private.has_contact_info(a) or private.has_contact_info(b)) then
    raise exception 'Names can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.hosted_entrants where event_id = ev) + (select count(*) from public.hosted_guests where event_id = ev) >= e.entrant_cap then
    raise exception 'This event is full.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.hosted_guests where event_id = ev and lower(btrim(tag)) = lower(a || ' / ' || b)) then
    raise exception 'That team is already in the event.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('host_add_guest', 300, interval '1 day');
  insert into public.hosted_guests (event_id, tag, checked_in_at) values (ev, a || ' / ' || b, now()) returning id into gid;
  insert into public.hosted_team_members (guest_id, event_id, slot, user_id, name) values (gid, ev, 1, null, a), (gid, ev, 2, null, b);
  return gid;
end;
$$;

revoke all on function public.join_hosted_team(uuid, uuid, text), public.leave_hosted_team(uuid), public.check_in_hosted_team(uuid), public.host_add_team(uuid, text, text) from public, anon;
grant execute on function public.join_hosted_team(uuid, uuid, text), public.leave_hosted_team(uuid), public.check_in_hosted_team(uuid), public.host_add_team(uuid, text, text) to authenticated;

-- ---------- Singles sign-up and walk-ins: unchanged, except that a doubles event refuses them ----------

create or replace function public.join_hosted_event(ev uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare e record; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into e from public.hosted_events where id = ev for update;
  if e is null or e.removed_at is not null then raise exception 'That event isn''t available.' using errcode = 'P0001'; end if;
  if e.team_size <> 1 then raise exception 'This is a doubles event: sign up with a partner.' using errcode = 'P0001'; end if;
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

create or replace function public.host_add_guest(ev uuid, guest_tag text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare e record; t text := btrim(coalesce(guest_tag, '')); gid uuid;
begin
  select * into e from public.hosted_events where id = ev for update;
  if e is null or not private.runs_event(ev, auth.uid()) or e.status not in ('open', 'closed') then
    raise exception 'Only the host can add players, before the bracket starts.' using errcode = 'P0001';
  end if;
  if e.team_size <> 1 then raise exception 'This is a doubles event: add a team (two names).' using errcode = 'P0001'; end if;
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
