-- A final bracket after round robin pools or Swiss rounds: the top players of the first part go
-- into a single or double elimination bracket in the same event ("pools into Top 8").
--
-- All the bracket logic lives in the app (bracketEngine.ts). The sets of the final bracket use the
-- kinds elimination brackets already use, so only the event needs two new settings:
--   final_format: 'single_elim' or 'double_elim' (empty = no final bracket; the standings decide it)
--   final_size:   how many players go through (2 to 64)
-- Hosts can set them like the other event settings. They're ignored on elimination events.
--
-- Nothing here changes or deletes existing rows: both columns are empty for every existing event.

alter table public.hosted_events add column final_format text check (final_format is null or final_format in ('single_elim', 'double_elim'));
alter table public.hosted_events add column final_size int check (final_size is null or final_size between 2 and 64);
grant insert (final_format, final_size), update (final_format, final_size) on public.hosted_events to authenticated;
