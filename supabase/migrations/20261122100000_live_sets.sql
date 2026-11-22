-- Hosted events, phase 3 (additive): live sets. Players strike stages and report games from their own
-- devices; the server checks every move and saves the set's live state here (written only by the
-- server after checking the player is in the set). Live updates already cover hosted_sets.

-- Who strikes first, strikes, bans, the stage, games played, and a game result waiting to be confirmed.
alter table public.hosted_sets add column live jsonb;

-- Each player's connect code for the event (Slippi code, arena ID, friend code). No phone numbers.
alter table public.hosted_entrants add column connect_code text check (
  connect_code is null or (
    connect_code ~ '^[A-Za-z0-9#: /-]{2,40}$'
    and (connect_code ~* '^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$' or not private.has_contact_info(connect_code))
  )
);
grant update (connect_code) on public.hosted_entrants to authenticated;
create policy "Players set their own connect code" on public.hosted_entrants for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Guests don't see connect codes (signed-in players do, like Play lobbies).
revoke select on public.hosted_entrants from anon;
grant select (event_id, user_id, seed, checked_in_at, created_at) on public.hosted_entrants to anon;

-- "You're up": a notification (and a push) when a player's set is called.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder', 'weekly_digest', 'set_ready'
));

create or replace function private.push_notification() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.type in ('reply', 'mention', 'quote', 'follow', 'follow_request', 'follow_accepted', 'message_request', 'major_live', 'event_reminder', 'set_ready') then
    perform private.request_push('notification', new.id);
  end if;
  return null;
end;
$$;
