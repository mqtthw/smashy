-- Round 719: safety fixes from the 2026-11-22 review (docs/code-review-2026-11-22.md, items 2.1, 2.2,
-- 2.5, 2.6). Nothing here changes or deletes existing rows.

-- 2.1 Ladder: a match's two connect codes get the waiting queue's rule (allowed characters, and no
-- contact info unless it's a Switch friend code). When someone was already waiting, the caller's code
-- went straight into the match with only a length limit, so a phone number or a Discord invite could
-- be shown to the opponent. A refused code raises 23514, which the action already shows as "check your code".
-- (Dropped first: the two rules reached the live database ahead of the rest of this file, so a plain
-- "add" stopped the whole migration. This way it runs the same whether they're there or not.)
alter table public.ladder_matches
  drop constraint if exists ladder_matches_p1_connect_check,
  drop constraint if exists ladder_matches_p2_connect_check;
alter table public.ladder_matches
  add constraint ladder_matches_p1_connect_check check (
    p1_connect ~ '^[A-Za-z0-9#: /-]{2,40}$'
    and (p1_connect ~* '^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$' or not private.has_contact_info(p1_connect))
  ),
  add constraint ladder_matches_p2_connect_check check (
    p2_connect ~ '^[A-Za-z0-9#: /-]{2,40}$'
    and (p2_connect ~* '^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$' or not private.has_contact_info(p2_connect))
  );

-- 2.2 Play lobbies and Play chat: only members with a Smashy profile read them (a login that never
-- finished signing up has given no birthday and has no name anyone could block or report). Matthew's
-- call: not split by age group. Blocks apply as before; a host always sees their own lobby.
drop policy if exists "Signed-in users see open lobbies (and their own)" on public.lobbies;
drop policy if exists "Members see open lobbies (and their own)" on public.lobbies;
create policy "Members see open lobbies (and their own)" on public.lobbies for select to authenticated
  using (
    (closed_at is null and closes_at > now() and (select private.viewer_has_profile()) and not private.is_blocked(host_id, (select auth.uid())))
    or host_id = (select auth.uid())
  );

drop policy if exists "Signed-in users read the last 24 hours of chat" on public.chat_messages;
drop policy if exists "Members read the last 24 hours of chat" on public.chat_messages;
create policy "Members read the last 24 hours of chat" on public.chat_messages for select to authenticated
  using (
    removed_at is null and created_at > now() - interval '24 hours'
    and (select private.viewer_has_profile())
    and not private.is_blocked(author_id, (select auth.uid()))
  );

-- 2.5, 2.6 Reports: leagues and videos attached to sets can be reported (the server writes the row).
alter table public.live_reports drop constraint if exists live_reports_kind_check;
alter table public.live_reports add constraint live_reports_kind_check
  check (kind in ('chat', 'lobby', 'highlight', 'reel', 'message', 'profile', 'event', 'league', 'vod'));
