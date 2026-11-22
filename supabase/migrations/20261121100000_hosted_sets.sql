-- Hosted events, phase 2 (additive): the bracket. One row per set; each set says where its winner and
-- loser go next, so results move players forward. Generated and updated only by the server (after it
-- checks that the request comes from the event's host); everyone can read brackets.

create table public.hosted_sets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  bracket text not null check (bracket in ('W', 'L', 'GF', 'GF2', 'RR')), -- winners, losers, grand final (+ reset), round robin
  round int not null check (round between 1 and 64),
  idx int not null check (idx >= 0), -- position within its round
  pool int check (pool is null or pool between 1 and 64), -- round robin pool
  identifier text check (identifier is null or char_length(identifier) <= 4), -- "A", "B"… in play order
  best_of int not null default 3 check (best_of between 1 and 9),
  p1_id uuid references public.profiles (id) on delete set null,
  p2_id uuid references public.profiles (id) on delete set null,
  p1_bye boolean not null default false,
  p2_bye boolean not null default false,
  p1_score int check (p1_score is null or p1_score between -1 and 9), -- -1 = DQ
  p2_score int check (p2_score is null or p2_score between -1 and 9),
  winner int check (winner is null or winner in (1, 2)),
  state text not null default 'waiting' check (state in ('waiting', 'ready', 'live', 'done', 'bye', 'skipped')),
  winner_to uuid references public.hosted_sets (id) on delete set null,
  winner_slot int check (winner_slot is null or winner_slot in (1, 2)),
  loser_to uuid references public.hosted_sets (id) on delete set null,
  loser_slot int check (loser_slot is null or loser_slot in (1, 2)),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index hosted_sets_event_idx on public.hosted_sets (event_id, bracket, round, idx);
create index hosted_sets_players_idx on public.hosted_sets (p1_id, p2_id) where state in ('ready', 'live');

alter table public.hosted_sets enable row level security;
revoke all on public.hosted_sets from anon, authenticated;
grant select on public.hosted_sets to anon, authenticated;
create policy "Brackets are public" on public.hosted_sets for select using (true);

-- Live bracket updates (results show up without reloading).
alter publication supabase_realtime add table public.hosted_sets;
