-- "Check-in is open" reminders for hosted events (players who miss check-in get left out of the
-- bracket). Every 5 minutes: for events whose check-in has opened (and the bracket hasn't started),
-- notify every signed-up player who hasn't checked in yet, once per event. Events without check-in
-- get a "Starts in 1 hour" reminder instead. Uses the existing event_update notification type
-- (so the push goes out too). Additive: a new function and a scheduled job, no table changes.

create or replace function private.notify_hosted_checkins() returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  -- Check-in is open.
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
  select en.user_id, null, 'event_update', left('Check-in is open: ' || e.name || '. Tap to check in', 200), '/host/' || e.id
  from public.hosted_events e
  join public.hosted_entrants en on en.event_id = e.id
  where e.removed_at is null
    and e.status in ('open', 'closed')
    and e.checkin_minutes > 0
    and now() >= e.starts_at - make_interval(mins => e.checkin_minutes)
    and now() < e.starts_at + interval '2 hours'
    and en.checked_in_at is null
    and not exists (
      select 1 from public.notifications n
      where n.user_id = en.user_id and n.type = 'event_update' and n.event_href = '/host/' || e.id
        and n.event_name like 'Check-in is open:%'
    );

  -- No check-in: starts in about an hour.
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
  select en.user_id, null, 'event_update', left('Starts in 1 hour: ' || e.name, 200), '/host/' || e.id
  from public.hosted_events e
  join public.hosted_entrants en on en.event_id = e.id
  where e.removed_at is null
    and e.status in ('open', 'closed')
    and e.checkin_minutes = 0
    and now() >= e.starts_at - interval '60 minutes'
    and now() < e.starts_at
    and not exists (
      select 1 from public.notifications n
      where n.user_id = en.user_id and n.type = 'event_update' and n.event_href = '/host/' || e.id
        and n.event_name like 'Starts in 1 hour:%'
    );
end;
$$;
revoke all on function private.notify_hosted_checkins() from public, anon, authenticated;

select cron.schedule('notify-hosted-checkins', '*/5 * * * *', $$select private.notify_hosted_checkins()$$);
