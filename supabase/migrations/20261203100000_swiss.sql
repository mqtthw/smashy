-- Swiss as a format for events hosted on Smashy: everyone plays a set number of rounds, each round
-- against someone with the same record, and nobody is knocked out.
--
-- All bracket logic lives in the app (src/lib/swiss.ts and bracketEngine.ts). The database only
-- needs to accept the new values:
--   1. hosted_events.format may be 'swiss'.
--   2. hosted_events.swiss_rounds: how many rounds the host wants (empty = the usual number for the
--      field's size, filled in when the bracket starts). Hosts can set it like the other event
--      settings; it's ignored for other formats.
--   3. hosted_sets.bracket may be 'SW' (a Swiss set; `round` is the Swiss round).
--
-- Nothing here changes or deletes existing rows: the two lists only get longer, and the new column
-- is empty for every existing event.

alter table public.hosted_events drop constraint hosted_events_format_check;
alter table public.hosted_events add constraint hosted_events_format_check
  check (format in ('double_elim', 'single_elim', 'round_robin', 'swiss'));

alter table public.hosted_events add column swiss_rounds int check (swiss_rounds is null or swiss_rounds between 1 and 12);
grant insert (swiss_rounds), update (swiss_rounds) on public.hosted_events to authenticated;

alter table public.hosted_sets drop constraint hosted_sets_bracket_check;
alter table public.hosted_sets add constraint hosted_sets_bracket_check
  check (bracket in ('W', 'L', 'GF', 'GF2', 'RR', 'SW'));
