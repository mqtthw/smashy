-- Round 797: follow any start.gg player, on Smashy or not (a parent on r/smashbros asked start.gg for a way to
-- see where their kid competes next; Matthew chose this). A follow is private: only the person following can
-- see it, and it gives nothing to the player. Their upcoming tournaments come from start.gg's public
-- pages, read when the follower looks. Can be run again.

create table if not exists public.player_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  player_id text not null check (player_id ~ '^[0-9]{1,12}$'),   -- the start.gg player id
  tag text not null check (char_length(tag) between 1 and 60),    -- their tag when followed, for the list
  created_at timestamptz not null default now(),
  primary key (user_id, player_id)
);

alter table public.player_follows enable row level security;
revoke all on public.player_follows from anon, authenticated;
grant select, delete on public.player_follows to authenticated;
grant insert (user_id, player_id, tag) on public.player_follows to authenticated;

drop policy if exists "See your own player follows" on public.player_follows;
create policy "See your own player follows" on public.player_follows for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Follow a player yourself" on public.player_follows;
create policy "Follow a player yourself" on public.player_follows for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Unfollow a player yourself" on public.player_follows;
create policy "Unfollow a player yourself" on public.player_follows for delete to authenticated
  using (user_id = (select auth.uid()));
