-- Leagues, step L2 (docs/leagues-plan.md): the weekly sets. When the organizer starts the league,
-- the server writes one row per pairing per week (round robin inside each division). Reporting
-- scores comes in step L3; until then nobody but the server writes here.

create table public.league_sets (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  division int not null check (division between 1 and 32),
  week int not null check (week between 1 and 20),
  p1_id uuid not null references public.profiles (id) on delete cascade,
  p2_id uuid not null references public.profiles (id) on delete cascade,
  deadline timestamptz not null,
  state text not null default 'pending' check (state in ('pending', 'reported', 'confirmed', 'disputed', 'no_show', 'double_loss')),
  p1_score int check (p1_score is null or p1_score between -1 and 9),
  p2_score int check (p2_score is null or p2_score between -1 and 9),
  winner_id uuid references public.profiles (id) on delete set null,
  reported_by uuid references public.profiles (id) on delete set null,
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  check (p1_id <> p2_id)
);
create index league_sets_league_idx on public.league_sets (league_id, week, division);
create index league_sets_p1_idx on public.league_sets (p1_id, deadline);
create index league_sets_p2_idx on public.league_sets (p2_id, deadline);

alter table public.league_sets enable row level security;
revoke all on public.league_sets from anon, authenticated;
grant select on public.league_sets to anon, authenticated;
create policy "League sets are public" on public.league_sets for select using (true);
