-- Smash history, step A4 (part 2, docs/archive-plan.md): "Report a mistake". A signed-in member points
-- at a major or a moment that's wrong (a wrong name, date or placement; a duplicate; a dead link), says
-- what's wrong and can add a source. Site admins see open reports on Admin → Majors, fix or hide the
-- major/moment, and mark the report done.

create table public.history_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  major_slug text references public.majors (slug) on delete cascade,
  moment_id uuid references public.history_moments (id) on delete cascade,
  message text not null check (char_length(message) between 5 and 500),
  link text check (link is null or link ~ '^https://[^\s]+$'),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((major_slug is null) <> (moment_id is null))   -- exactly one of the two
);
create index history_reports_open_idx on public.history_reports (created_at) where status = 'open';
create index history_reports_user_idx on public.history_reports (user_id, created_at desc);

-- People see their own reports; everything else goes through the server (with the secret key).
alter table public.history_reports enable row level security;
revoke all on public.history_reports from anon, authenticated;
grant select on public.history_reports to authenticated;
create policy "Users see their own history reports" on public.history_reports for select to authenticated
  using (user_id = (select auth.uid()));
