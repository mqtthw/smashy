-- Round 637, from the senior review of 2026-11-20 (SPEC rounds 629–636).
--
-- 1. Photo safety checks are paid per photo. The hourly limits on post and message photos counted only
--    photos that were saved, so a photo the check blocked (never saved) could be sent again and again, each
--    one a paid check. limit_action gains 'photo_check': 60 checked photos an hour per person, counted
--    before the check runs (posts and messages together).
-- 2. host_remove_entrant removed a signed-up player even after the bracket started (only walk-ins were
--    guarded). The panel hides the button then, but an older open tab could still press it, leaving their
--    sets with no player and losing their placement. Now refused once the event is under way, like leaving.
--
-- Safe to run twice (create or replace).

create or replace function public.limit_action(action text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if action = 'avatar_upload' then
    perform private.rate_limit_as('avatar_upload', 10, interval '1 hour', 'You''ve changed your picture a lot. Try again in a bit.');
  elsif action = 'translate' then
    perform private.rate_limit_as('translate', 120, interval '1 hour', 'You''ve translated a lot of posts. Try again in a bit.');
  elsif action = 'photo_check' then
    perform private.rate_limit_as('photo_check', 60, interval '1 hour', 'You''re adding photos too fast. Try again in a bit.');
  else
    raise exception 'Unknown action.' using errcode = 'P0001';
  end if;
end;
$function$;

create or replace function public.host_remove_entrant(ev uuid, person uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not private.runs_event(ev, auth.uid()) then
    raise exception 'Only the host can do that.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.hosted_events where id = ev and status in ('open', 'closed')) then
    raise exception 'The bracket has started: DQ them from their set instead.' using errcode = 'P0001';
  end if;
  delete from public.hosted_entrants where event_id = ev and user_id = person;
  delete from public.hosted_guests where event_id = ev and id = person;
  delete from public.hosted_paid where event_id = ev and entry_id = person;
  perform private.promote_waitlist(ev);
end;
$function$;
