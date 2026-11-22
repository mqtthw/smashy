-- Slippi replay stats on a profile (docs/big-features-draft.md item 14, second part).
--
-- /replays reads a player's Slippi replays in their own browser. Now a member can save the summary
-- (their record, minutes, openings per kill and so on, and records by character and stage) and choose
-- whether it shows on their profile. Nothing about other players is saved: no opponents' names or
-- connect codes, and not the member's own connect code either. The numbers are self-reported (worked out
-- in the member's browser), and the profile says so.
--
-- Who can see a saved summary: its owner always; anyone else only when the owner chose to show it, and
-- for a teen (or a member without a birthday) only signed-in viewers, like the rest of a teen's profile.
-- One new table; nothing existing changes.

create table public.replay_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  summary jsonb not null check (jsonb_typeof(summary) = 'object' and octet_length(summary::text) <= 16000),
  games int not null check (games between 1 and 100000),
  shown boolean not null default false,
  saved_at timestamptz not null default now()
);

alter table public.replay_stats enable row level security;
revoke all on public.replay_stats from anon, authenticated;
grant select on public.replay_stats to anon, authenticated;
grant insert, update, delete on public.replay_stats to authenticated;

create policy "Replay stats: the owner, or shown ones (teens' only to signed-in viewers)"
  on public.replay_stats for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (shown and ((select auth.uid()) is not null or not private.is_minor(user_id)))
  );

create policy "Replay stats: members save their own"
  on public.replay_stats for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Replay stats: members change their own"
  on public.replay_stats for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Replay stats: members remove their own"
  on public.replay_stats for delete to authenticated
  using (user_id = (select auth.uid()));
