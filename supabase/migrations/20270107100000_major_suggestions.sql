-- Smash history, step A4 (docs/archive-plan.md): members suggest a missing major; a site admin
-- reviews it before it shows (like Reels clip submissions). Two kinds:
--   'link'   a start.gg or parry.gg tournament link (2017 on): approving it adds the major as if an
--            admin had pasted the link.
--   'manual' a major from before start.gg (2002 to 2016): the same fields as the admin form, with a
--            required source link; approving it adds it to Smash history by hand.
-- Approved majors credit who suggested them ("Suggested by @handle", following profile privacy).

create table public.major_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('link', 'manual')),
  link text check (link is null or link ~ '^https://[^\s]+$'),
  -- For 'manual': { name, start, end, city, country, sourceUrl, games: [{ game, eventName, entrants, top8 }] }
  details jsonb check (details is null or jsonb_typeof(details) = 'object'),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  major_slug text references public.majors (slug) on delete set null,   -- what approving it added
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check ((kind = 'link' and link is not null) or (kind = 'manual' and details is not null))
);
create index major_suggestions_user_idx on public.major_suggestions (user_id, created_at desc);
create index major_suggestions_pending_idx on public.major_suggestions (created_at) where status = 'pending';

-- People see their own suggestions; everything else goes through the server (with the secret key).
alter table public.major_suggestions enable row level security;
revoke all on public.major_suggestions from anon, authenticated;
grant select on public.major_suggestions to authenticated;
create policy "Users see their own major suggestions" on public.major_suggestions for select to authenticated
  using (user_id = (select auth.uid()));

-- Who suggested an approved major (credited on its page).
alter table public.majors add column suggested_by uuid references public.profiles (id) on delete set null;
