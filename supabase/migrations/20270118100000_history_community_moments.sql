-- Smash history: community milestones on the timeline (round after 530; docs/archive-plan.md, Phase 2).
-- Plain facts in Smashy's own words, each dated and linked to the Wikipedia article it was checked against
-- on 2026-11-19. Milestones whose exact day Wikipedia doesn't give (the Smash Brothers documentary, Slippi's
-- online play, Nintendo's 2020 letter to The Big House) are left out rather than guessed. Approved moments,
-- like the game releases (20270110100000). Safe to run twice: the same date and title are skipped.

insert into public.history_moments (happened_on, title, link, game, status, reviewed_at)
select v.happened_on::date, v.title, v.link, v.game, 'approved', now()
from (values
  ('2011-10-22', 'The first Big House is held, in Ann Arbor', 'https://en.wikipedia.org/wiki/The_Big_House_(tournament)', null),
  ('2013-07-12', 'EVO 2013 begins with Melee, voted in by a donation drive that raised $94,683 for the Breast Cancer Research Foundation', 'https://en.wikipedia.org/wiki/Evolution_Championship_Series', 'melee'),
  ('2019-08-02', 'EVO 2019 begins, the first EVO with Super Smash Bros. Ultimate', 'https://en.wikipedia.org/wiki/Evolution_Championship_Series', 'ultimate'),
  ('2020-03-01', 'The Smash World Tour is announced', 'https://en.wikipedia.org/wiki/Smash_World_Tour', null),
  ('2021-12-17', 'The first Smash World Championships begin (Smash World Tour 2021)', 'https://en.wikipedia.org/wiki/Smash_World_Tour', null),
  ('2022-11-29', 'The Smash World Tour organizers cancel the 2022 Championships, saying Nintendo forced them to; Nintendo disputes this', 'https://en.wikipedia.org/wiki/Smash_World_Tour', null)
) as v (happened_on, title, link, game)
where not exists (
  select 1 from public.history_moments m where m.happened_on = v.happened_on::date and m.title = v.title
);
