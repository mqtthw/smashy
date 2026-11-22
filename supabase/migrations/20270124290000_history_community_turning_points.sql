-- Smash history: more of the community's turning points on the timeline (after Round 620; Matthew,
-- 2026-11-19: "any other relevant events deserve to belong on the history page"). Plain facts in Smashy's own
-- words, each linked to the SmashWiki page its date was checked against on 2026-11-19. Left out: Ultimate's last
-- balance update (13.0.1), whose page gives no date. Approved moments; safe to run twice.

insert into public.history_moments (happened_on, title, link, game, status, reviewed_at)
select v.happened_on::date, v.title, v.link, v.game, 'approved', now()
from (values
  ('2009-07-10', 'The first GENESIS is held, in Antioch, California', 'https://www.ssbwiki.com/Tournament:GENESIS', null),
  ('2014-06-20', 'Melee returns to MLG at MLG Anaheim 2014, its first MLG event since 2006', 'https://www.ssbwiki.com/Major_League_Gaming', 'melee'),
  ('2015-07-17', 'EVO 2015 begins, with Smash for Wii U alongside Melee', 'https://www.ssbwiki.com/Tournament:EVO_2015', null),
  ('2015-08-06', 'The first Super Smash Con is held, in Chantilly, Virginia', 'https://www.ssbwiki.com/Tournament:Super_Smash_Con_2015', null),
  ('2015-11-05', 'The first Smash Summit begins in Los Angeles, with 16 players', 'https://www.ssbwiki.com/Tournament:Smash_Summit', 'melee'),
  ('2018-06-12', 'The Super Smash Bros. Invitational 2018 is held at E3, showing Ultimate before release', 'https://www.ssbwiki.com/Super_Smash_Bros._Ultimate_in_competitive_play', 'ultimate'),
  ('2022-06-24', 'The Panda Cup circuit begins', 'https://www.ssbwiki.com/Panda_Cup', null),
  ('2023-11-23', 'The Panda Cup championships, postponed since December 2022, are confirmed cancelled', 'https://www.ssbwiki.com/Panda_Cup', null)
) as v (happened_on, title, link, game)
where not exists (
  select 1 from public.history_moments m where m.happened_on = v.happened_on::date and m.title = v.title
);
