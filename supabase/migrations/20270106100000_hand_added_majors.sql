-- Smash history, step A3 (docs/archive-plan.md): majors from before start.gg (2002 to 2016), added
-- by hand by site admins. Facts only (name, dates, place, games, entrants, top 8) and a link to where
-- the results come from (Liquipedia, SmashWiki, the organizer's page); no copied text.
-- Their slug is "manual/<year>-<name>", so they never collide with a start.gg slug, and their
-- events are saved in major_events like everyone else's (event id "manual-<game>-<n>").

alter table public.majors drop constraint majors_source_check;
alter table public.majors add constraint majors_source_check check (source in ('auto', 'admin', 'manual'));

-- Where a hand-added major's results come from (required for 'manual', https only).
alter table public.majors add column source_url text check (source_url is null or source_url ~ '^https://[^\s]+$');
alter table public.majors add constraint majors_manual_source check (source <> 'manual' or source_url is not null);
-- The admin who added it (credited on its page).
alter table public.majors add column added_by uuid references public.profiles (id) on delete set null;
