-- Smash history: the documentaries and the community's turning points on the timeline (Matthew, 2026-11-19:
-- "The smash documentary and metagame and any other relevant events deserve to belong on the history page").
-- Plain facts in Smashy's own words, each linked to the SmashWiki or Wikipedia page it was checked against on
-- 2026-11-19. The Smash Brothers documentary came out in October 2013, but no source gives the day, so a moment
-- can now be dated by month only (month_only: shown as "Oct 2013" style, stored as the 1st). Approved moments,
-- like 20270118100000. Safe to run twice: the same date and title are skipped.

alter table public.history_moments add column if not exists month_only boolean not null default false;

insert into public.history_moments (happened_on, month_only, title, link, game, status, reviewed_at)
select v.happened_on::date, v.month_only, v.title, v.link, v.game, 'approved', now()
from (values
  ('2002-01-24', false, 'The first known mention of wavedashing in Melee, a Smashboards thread', 'https://www.ssbwiki.com/Wavedash', 'melee'),
  ('2011-09-30', false, 'The Unity Ruleset Committee announces a ban of Meta Knight in Brawl singles and doubles, starting January 9, 2012', 'https://www.ssbwiki.com/Meta_Knight_(SSBB)', 'brawl'),
  ('2013-10-01', true, 'The Smash Brothers, a nine-part Melee documentary series by Travis "Samox" Beauchamp, comes out free on YouTube', 'https://en.wikipedia.org/wiki/The_Smash_Brothers', 'melee'),
  ('2014-06-10', false, 'The Super Smash Bros. Invitational is held at E3 2014, showing Smash for Wii U before release', 'https://www.ssbwiki.com/Super_Smash_Bros._Invitational', 'smash4'),
  ('2016-02-03', false, 'Bayonetta and Corrin come out as downloadable fighters for Smash 4', 'https://www.ssbwiki.com/Bayonetta_(SSB4)', 'smash4'),
  ('2017-08-08', false, 'The Universal Controller Fix for Melee comes out, by Dan Salvato', 'https://www.ssbwiki.com/Universal_Controller_Fix', 'melee'),
  ('2018-06-18', false, 'Project Slippi launches publicly', 'https://www.ssbwiki.com/Slippi', 'melee'),
  ('2020-06-22', false, 'Slippi adds rollback netcode and matchmaking, for online Melee', 'https://www.ssbwiki.com/Slippi', 'melee'),
  ('2020-10-13', false, 'Steve from Minecraft comes out as a downloadable fighter in Ultimate', 'https://www.ssbwiki.com/Steve_(SSBU)', 'ultimate'),
  ('2020-11-19', false, 'The Big House Online is cancelled after Nintendo of America sends its organizers a cease and desist letter over the use of Slippi', 'https://www.ssbwiki.com/Cancellation_of_The_Big_House_Online', null),
  ('2020-12-11', false, 'Metagame, Samox''s follow-up documentary about Melee''s "Five Gods", premieres on Twitch (December 11–13)', 'https://www.ssbwiki.com/Metagame_(documentary)', 'melee'),
  ('2021-06-06', false, 'Godslayer, a bonus episode of Metagame about Leffen, premieres', 'https://www.ssbwiki.com/Metagame_(documentary)', 'melee'),
  ('2021-10-18', false, 'Sora comes out, the last downloadable fighter in Ultimate', 'https://www.ssbwiki.com/Sora_(SSBU)', 'ultimate'),
  ('2023-10-24', false, 'Nintendo publishes its Community Tournament Guidelines, in effect from November 15, 2023', 'https://www.ssbwiki.com/Nintendo_Community_Tournament_Guidelines', null)
) as v (happened_on, month_only, title, link, game)
where not exists (
  select 1 from public.history_moments m where m.happened_on = v.happened_on::date and m.title = v.title
);
