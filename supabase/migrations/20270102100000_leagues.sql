-- Leagues, step L1 (docs/leagues-plan.md): weeks of sets in divisions, then playoffs. This step holds
-- the league itself and its sign-ups; divisions, weekly sets and standings come in later steps.

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  online boolean not null default true,
  location text check (location is null or char_length(btrim(location)) between 2 and 120),
  region text check (region is null or char_length(region) <= 40),
  timezone text not null default 'America/Chicago' check (char_length(timezone) <= 60),
  starts_at timestamptz not null, -- week 1 opens
  weeks int not null default 6 check (weeks between 1 and 20),
  best_of int not null default 3 check (best_of between 1 and 9),
  playoff_size int check (playoff_size is null or playoff_size between 2 and 16), -- top N of each division
  player_cap int not null default 64 check (player_cap between 2 and 256),
  ruleset_id uuid references public.rulesets (id) on delete set null,
  description text check (description is null or char_length(description) <= 2000),
  status text not null default 'signups' check (status in ('signups', 'running', 'playoffs', 'completed', 'canceled')),
  removed_at timestamptz,
  removed_reason text,
  created_at timestamptz not null default now()
);
create index leagues_start_idx on public.leagues (starts_at desc) where removed_at is null;
create index leagues_host_idx on public.leagues (host_id, created_at desc);

create table public.league_players (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  division int check (division is null or division between 1 and 32), -- set by the organizer (L2)
  seed int check (seed is null or seed between 1 and 256),
  created_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_players_user_idx on public.league_players (user_id, created_at desc);

alter table public.leagues enable row level security;
alter table public.league_players enable row level security;
revoke all on public.leagues, public.league_players from anon, authenticated;

grant select on public.leagues, public.league_players to anon, authenticated;
create policy "Leagues are public" on public.leagues for select
  using (removed_at is null or host_id = (select auth.uid()));
create policy "League players are public" on public.league_players for select using (true);

grant insert (host_id, name, game, online, location, region, timezone, starts_at, weeks, best_of, playoff_size, player_cap, ruleset_id, description)
  on public.leagues to authenticated;
grant update (name, online, location, region, timezone, starts_at, weeks, best_of, playoff_size, player_cap, ruleset_id, description, status)
  on public.leagues to authenticated;
create policy "Organizers create their own leagues" on public.leagues for insert to authenticated
  with check (host_id = (select auth.uid()));
create policy "Organizers edit their own leagues" on public.leagues for update to authenticated
  using (host_id = (select auth.uid()) and removed_at is null) with check (host_id = (select auth.uid()));

create function private.before_league() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.rate_limit('create_league', 3, interval '1 day');
    if new.starts_at < now() - interval '1 day' then
      raise exception 'Pick a start date from today on.' using errcode = 'P0001';
    end if;
  end if;
  if new.starts_at > now() + interval '1 year' then
    raise exception 'Leagues can start up to a year ahead.' using errcode = 'P0001';
  end if;
  if private.is_minor(new.host_id) and (private.has_contact_info(new.name) or private.has_contact_info(coalesce(new.description, '')) or private.has_contact_info(coalesce(new.location, ''))) then
    raise exception 'League details can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.before_league() from public;
create trigger leagues_before before insert or update on public.leagues
  for each row execute function private.before_league();

-- Joining and leaving go through these, so the rules can't be skipped.
create function public.join_league(lg uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare l record; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into l from public.leagues where id = lg for update;
  if l is null or l.removed_at is not null then raise exception 'That league isn''t available.' using errcode = 'P0001'; end if;
  if l.status <> 'signups' then raise exception 'Sign-ups are closed.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = l.host_id and b.blocked_id = uid) or (b.blocker_id = uid and b.blocked_id = l.host_id)) then
    raise exception 'You can''t join this league.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.league_players where league_id = lg) >= l.player_cap then
    raise exception 'This league is full.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('join_league', 20, interval '1 hour');
  insert into public.league_players (league_id, user_id) values (lg, uid) on conflict do nothing;
end;
$$;

create function public.leave_league(lg uuid) returns void
  language sql security definer set search_path = ''
as $$
  delete from public.league_players lp
  using public.leagues l
  where lp.league_id = lg and lp.user_id = auth.uid() and l.id = lp.league_id and l.status = 'signups';
$$;

-- The organizer removes a player while sign-ups are open.
create function public.league_remove_player(lg uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.leagues where id = lg and host_id = auth.uid() and status = 'signups') then
    raise exception 'Only the organizer can remove players before the league starts.' using errcode = 'P0001';
  end if;
  delete from public.league_players where league_id = lg and user_id = person;
end;
$$;

revoke all on function public.join_league(uuid), public.leave_league(uuid), public.league_remove_player(uuid, uuid) from public, anon;
grant execute on function public.join_league(uuid), public.leave_league(uuid), public.league_remove_player(uuid, uuid) to authenticated;
