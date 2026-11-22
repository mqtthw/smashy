-- Smash history, steps H4 and H5 (docs/archive-plan.md): the sets played at each major, saved once from
-- start.gg, for head-to-head at majors (player compare page) and the characters each top 8 player used.
-- One row per set of a major's main singles bracket per game, from the final phases (top 64 on; the
-- whole bracket when it has no such phase), with both players, the score, the winner and the characters
-- start.gg recorded for each game. Facts only, from start.gg. Filled slowly by the server.

create table public.major_sets (
  set_id text primary key,                         -- start.gg set id (opens /sets/startgg/<id>)
  major_slug text not null,
  event_id text not null,                          -- major_events.event_id ("manual-melee-1" for majors added by hand)
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  phase text,                                      -- "Top 64"
  round text,                                      -- "Winners Semi-Final"
  sort_order int not null default 0,               -- phase, then round, for listing a major's sets in order
  completed_at timestamptz,
  p1_id text check (p1_id ~ '^[0-9]{1,12}$'),     -- start.gg player id (null for a deleted account)
  p1_name text not null,
  p1_score int,
  p1_chars text[] not null default '{}',           -- start.gg character names, most played first
  p2_id text check (p2_id ~ '^[0-9]{1,12}$'),
  p2_name text not null,
  p2_score int,
  p2_chars text[] not null default '{}',
  winner smallint not null check (winner in (1, 2)),
  saved_at timestamptz not null default now(),
  foreign key (major_slug, event_id) references public.major_events (major_slug, event_id) on delete cascade
);
create index major_sets_p1_idx on public.major_sets (p1_id);
create index major_sets_p2_idx on public.major_sets (p2_id);
create index major_sets_event_idx on public.major_sets (major_slug, event_id);

alter table public.major_sets enable row level security;
revoke all on public.major_sets from anon, authenticated;
grant select on public.major_sets to anon, authenticated;
create policy "Major sets are public" on public.major_sets for select to anon, authenticated using (true);
-- Writes happen on the server only (with the secret key).

-- Which brackets have their sets saved (or are being saved: a claim older than 15 minutes counts as dead).
create table public.major_set_progress (
  major_slug text not null,
  event_id text not null,
  startgg_event_id text,
  sets int,
  note text,                                       -- the phases saved, or why nothing was ("not found on start.gg")
  -- Characters each player used in this bracket, most played first (step H5), so pages read one row
  -- instead of every set: { "<start.gg player id>" | "name:<tag key>": ["Fox", "Falco"] }
  characters jsonb not null default '{}'::jsonb check (jsonb_typeof(characters) = 'object'),
  claimed_at timestamptz,
  done_at timestamptz,
  primary key (major_slug, event_id),
  foreign key (major_slug, event_id) references public.major_events (major_slug, event_id) on delete cascade
);
alter table public.major_set_progress enable row level security;
revoke all on public.major_set_progress from anon, authenticated;
grant select on public.major_set_progress to anon, authenticated;
create policy "Saved bracket summaries are public" on public.major_set_progress for select to anon, authenticated using (true);
-- Writes happen on the server only (with the secret key).

-- Claims one bracket for saving its sets; false when it's done or another server has it.
create or replace function public.claim_major_set_event(slug text, event text) returns boolean
  language sql security definer set search_path = ''
as $$
  with up as (
    insert into public.major_set_progress as p (major_slug, event_id, claimed_at)
    values (slug, event, now())
    on conflict (major_slug, event_id) do update set claimed_at = now()
      where p.done_at is null and (p.claimed_at is null or p.claimed_at < now() - interval '15 minutes')
    returning 1
  )
  select exists (select 1 from up)
$$;
revoke all on function public.claim_major_set_event(text, text) from public, anon, authenticated;
grant execute on function public.claim_major_set_event(text, text) to service_role;
