-- A night that runs itself: two optional settings on an event.
--
--   setups:          how many setups the venue has (1 to 64). When set, Smashy gives each called
--                    set the next free "Setup N" by itself, and when a set finishes its setup goes
--                    to the set that has waited longest. Empty = the TO assigns setups by hand,
--                    as before.
--   no_show_minutes: how long players have to turn up once their set has a place to play (3 to 60
--                    minutes). After that the TO is shown who hasn't tapped "I'm here" and can
--                    disqualify them with one tap. Nobody is disqualified automatically.
--                    Empty = no clock, as before.
--
-- Hosts set both like the other event settings. Everything else (which set is on which setup,
-- who said they're here) lives in each set's existing live state, so no other table changes.
--
-- Nothing here changes or deletes existing rows: both settings are empty for every existing event.

alter table public.hosted_events add column setups int check (setups is null or setups between 1 and 64);
alter table public.hosted_events add column no_show_minutes int check (no_show_minutes is null or no_show_minutes between 3 and 60);
grant insert (setups, no_show_minutes), update (setups, no_show_minutes) on public.hosted_events to authenticated;
