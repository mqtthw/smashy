-- Names on the PR: the name a scene's ranking (its PR on Braacket) already uses for a player.
--
-- Braacket matches players by name when it imports a bracket, so "blair_sa" on Smashy and "Blair" on
-- the league would become two people. Before copying a finished bracket to Challonge (which Braacket
-- imports), a host can set each player's PR name; the copy uses it instead of the Smashy tag.
--
-- Remembered per host, not per event: once a host sets a player's PR name, their next events (next
-- week's weekly) use it too. One row per host per player: a Smashy member (user_id) or a walk-in
-- the host added by tag (guest_tag, matched without capitals).
--
-- Only the server reads and writes this table (hosts set names through the site, which checks they
-- run the event). Players never see it. Nothing here changes or deletes existing data.

create table public.pr_names (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  guest_tag text check (guest_tag is null or char_length(btrim(guest_tag)) between 1 and 30),
  pr_name text not null check (char_length(btrim(pr_name)) between 1 and 60),
  updated_at timestamptz not null default now(),
  check ((user_id is null) <> (guest_tag is null))
);
create unique index pr_names_member_idx on public.pr_names (host_id, user_id) where user_id is not null;
create unique index pr_names_guest_idx on public.pr_names (host_id, lower(btrim(guest_tag))) where guest_tag is not null;
create index pr_names_user_idx on public.pr_names (user_id);

alter table public.pr_names enable row level security;
revoke all on public.pr_names from anon, authenticated;
-- No policies on purpose: only the server touches this table.
