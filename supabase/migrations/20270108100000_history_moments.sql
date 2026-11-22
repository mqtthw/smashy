-- Smash history, step A6 (docs/archive-plan.md): a timeline of moments. Each moment is a date, a short
-- factual title in the writer's own words ("Hungrybox wins Evo 2016"), an optional short note, an
-- optional game, and a required link to a VOD or a source. No verdicts ("greatest upset ever").
-- Admins add moments directly; members suggest them and an admin approves (Matthew, 2026-11-17),
-- like majors (round 473). Shown on each year of Smash history and on /history/timeline.

create table public.history_moments (
  id uuid primary key default gen_random_uuid(),
  happened_on date not null check (happened_on >= date '1999-01-01'),   -- Smash 64 came out in 1999
  title text not null check (char_length(title) between 3 and 140),
  note text check (note is null or char_length(note) <= 280),
  link text not null check (link ~ '^https://[^\s]+$'),
  game text check (game is null or game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  suggested_by uuid references public.profiles (id) on delete set null,  -- a member's suggestion
  added_by uuid references public.profiles (id) on delete set null,      -- the admin who added or approved it
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index history_moments_day_idx on public.history_moments (happened_on) where status = 'approved';
create index history_moments_pending_idx on public.history_moments (created_at) where status = 'pending';
create index history_moments_user_idx on public.history_moments (suggested_by, created_at desc);

-- Approved moments are public; members also see their own suggestions. Writes go through the server.
alter table public.history_moments enable row level security;
revoke all on public.history_moments from anon, authenticated;
grant select on public.history_moments to anon, authenticated;
create policy "Approved moments are public" on public.history_moments for select to anon, authenticated
  using (status = 'approved' or suggested_by = (select auth.uid()));
