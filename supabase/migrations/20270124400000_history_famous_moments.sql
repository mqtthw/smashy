-- Smash history: famous moments on the timeline (after Round 625). Facts only, in Smashy's own words, no
-- verdicts; each date checked on its SmashWiki page on 2026-11-19, which is the linked source. Approved
-- moments; safe to run twice.

insert into public.history_moments (happened_on, title, link, game, status, reviewed_at)
select v.happened_on::date, v.title, v.link, v.game, 'approved', now()
from (values
  ('2008-12-06', 'The Wombo Combo: SilentSpectre and Tang''s combo on Zhu in doubles at SCSA West Coast Circuit', 'https://www.ssbwiki.com/Wombo_Combo', 'melee'),
  ('2015-01-31', 'Leffen beats Chillin 5-0 in their Fox money match at Apex 2015, winning the rights to Fox''s default color', 'https://www.ssbwiki.com/Leffen_vs._Chillin_(Apex_2015)', 'melee'),
  ('2020-01-26', 'EmpLemon releases his video essay on Hungrybox, during GENESIS 7''s Melee top 8', 'https://www.ssbwiki.com/There_will_Never_Ever_be_another_Melee_player_like_Hungrybox', 'melee')
) as v (happened_on, title, link, game)
where not exists (
  select 1 from public.history_moments m where m.happened_on = v.happened_on::date and m.title = v.title
);
