-- Smash history (Matthew, 2026-11-20): take the Leffen vs. Chillin money match and the Godslayer bonus episode off
-- the timeline, and add the release date of every downloadable fighter in Smash 4 and Ultimate. Dates are the
-- worldwide release dates on SmashWiki's "Downloadable content (SSB4)" and "(SSBU)" pages, read 2026-11-20 (some
-- regions got Ultimate's fighters a day later). Bayonetta and Corrin, Steve and Sora were already on the timeline.
-- Safe to run twice.

delete from public.history_moments
where (happened_on = date '2015-01-31'
       and title = 'Leffen beats Chillin 5-0 in their Fox money match at Apex 2015, winning the rights to Fox''s default color')
   or (happened_on = date '2021-06-06'
       and title = 'Godslayer, a bonus episode of Metagame about Leffen, premieres');

insert into public.history_moments (happened_on, title, link, game, status, reviewed_at)
select v.happened_on::date, v.title, v.link, v.game, 'approved', now()
from (values
  ('2015-04-28', 'Mewtwo comes out as a downloadable fighter for Smash 4, the series'' first', 'https://www.ssbwiki.com/Downloadable_content_(SSB4)', 'smash4'),
  ('2015-06-14', 'Lucas, Roy and Ryu come out as downloadable fighters for Smash 4', 'https://www.ssbwiki.com/Downloadable_content_(SSB4)', 'smash4'),
  ('2015-12-15', 'Cloud comes out as a downloadable fighter for Smash 4', 'https://www.ssbwiki.com/Downloadable_content_(SSB4)', 'smash4'),
  ('2019-01-29', 'Piranha Plant comes out as Ultimate''s first downloadable fighter', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2019-04-17', 'Joker comes out as a downloadable fighter in Ultimate (Fighters Pass Vol. 1)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2019-07-30', 'Hero comes out as a downloadable fighter in Ultimate (Fighters Pass Vol. 1)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2019-09-04', 'Banjo & Kazooie come out as a downloadable fighter in Ultimate (Fighters Pass Vol. 1)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2019-11-06', 'Terry comes out as a downloadable fighter in Ultimate (Fighters Pass Vol. 1)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2020-01-28', 'Byleth comes out as a downloadable fighter in Ultimate, the last of Fighters Pass Vol. 1', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2020-06-29', 'Min Min comes out as a downloadable fighter in Ultimate (Fighters Pass Vol. 2)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2020-12-22', 'Sephiroth comes out as a downloadable fighter in Ultimate (Fighters Pass Vol. 2)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2021-03-04', 'Pyra and Mythra come out as a downloadable fighter in Ultimate (Fighters Pass Vol. 2)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate'),
  ('2021-06-29', 'Kazuya comes out as a downloadable fighter in Ultimate (Fighters Pass Vol. 2)', 'https://www.ssbwiki.com/Downloadable_content_(SSBU)', 'ultimate')
) as v (happened_on, title, link, game)
where not exists (
  select 1 from public.history_moments m where m.happened_on = v.happened_on::date and m.title = v.title
);
