-- Smash history: take EmpLemon's Hungrybox video essay off the timeline (Matthew, 2026-11-19: "the hbox video
-- essay is not necessary"). It was added in 20270124400000. Safe to run twice.

delete from public.history_moments
where happened_on = date '2020-01-26'
  and title = 'EmpLemon releases his video essay on Hungrybox, during GENESIS 7''s Melee top 8';
