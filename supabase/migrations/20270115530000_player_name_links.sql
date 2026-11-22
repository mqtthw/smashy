-- Smash history, step H2 (docs/archive-plan.md): one player across tags. Results added by hand (from
-- Liquipedia's lists, before start.gg) name players without a start.gg player id. An admin links such a
-- name ("Mango") to a start.gg player (Mang0, 1000), so careers, year tallies and "Top 8s at majors" run
-- from a player's first major to now. Admin-confirmed only (Matthew, 2026-11-18): nothing is linked
-- automatically. One name, one player.

create table public.player_name_links (
  name_key text primary key,                       -- the name lowercased, letters and digits only ("mango")
  name text not null check (char_length(name) between 1 and 60),
  player_id text not null check (player_id ~ '^[0-9]{1,12}$'),
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index player_name_links_player_idx on public.player_name_links (player_id);

-- Public (facts, like the results they connect); written by the server only.
alter table public.player_name_links enable row level security;
revoke all on public.player_name_links from anon, authenticated;
grant select on public.player_name_links to anon, authenticated;
create policy "Player name links are public" on public.player_name_links for select to anon, authenticated using (true);
