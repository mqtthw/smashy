-- Smash history: top 8 VODs for a major's game (docs/archive-plan.md). A link to a YouTube, Twitch or
-- Streamable video, or a YouTube playlist, with an optional short label ("Top 8", "Grand Finals").
-- Admins add them directly; members suggest them and an admin approves, like moments (round 477).
-- Links only: the video stays on its site.

create table public.major_vods (
  id uuid primary key default gen_random_uuid(),
  major_slug text not null references public.majors (slug) on delete cascade,
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  url text not null check (char_length(url) <= 300 and url ~ '^https://((www|m)\.)?(youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv|streamable\.com)/'),
  label text check (label is null or char_length(label) <= 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  suggested_by uuid references public.profiles (id) on delete set null,
  added_by uuid references public.profiles (id) on delete set null,   -- the admin who added or approved it
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (major_slug, game, url)
);
create index major_vods_major_idx on public.major_vods (major_slug) where status = 'approved';
create index major_vods_pending_idx on public.major_vods (created_at) where status = 'pending';
create index major_vods_user_idx on public.major_vods (suggested_by, created_at desc);

-- Approved VODs are public; members also see their own suggestions. Writes go through the server.
alter table public.major_vods enable row level security;
revoke all on public.major_vods from anon, authenticated;
grant select on public.major_vods to anon, authenticated;
create policy "Approved major VODs are public" on public.major_vods for select to anon, authenticated
  using (status = 'approved' or suggested_by = (select auth.uid()));
