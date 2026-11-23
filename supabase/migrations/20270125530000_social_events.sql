-- Social events (Paper King's idea): a hosted event with no bracket, for game nights, Jackbox and
-- other get-togethers. It is an ordinary hosted event (sign-ups, cap, waitlist, the event page) whose
-- format is 'social'; the app never builds a bracket for it.
--
-- One change: hosted_events.format may be 'social'. Safe to run twice.

alter table public.hosted_events drop constraint if exists hosted_events_format_check;
alter table public.hosted_events add constraint hosted_events_format_check
  check (format in ('double_elim', 'single_elim', 'round_robin', 'swiss', 'social'));
