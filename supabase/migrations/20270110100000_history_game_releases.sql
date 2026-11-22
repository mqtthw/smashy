-- Smash history from each game's release (Matthew, 2026-11-17: "we want history from the game's release").
-- The release dates of every Smash game (and Project M's milestones, filed under P+), as approved moments
-- on the timeline. Dates and links checked against each game's Wikipedia article on 2026-11-17, which is
-- also the linked source. Facts only. Safe to run twice: a moment with the same date and title is skipped.

insert into public.history_moments (happened_on, title, link, game, status, reviewed_at)
select v.happened_on::date, v.title, v.link, v.game, 'approved', now()
from (values
  ('1999-01-21', 'Super Smash Bros. comes out in Japan (Nintendo 64)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._(video_game)', 'smash64'),
  ('1999-04-26', 'Super Smash Bros. comes out in North America (Nintendo 64)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._(video_game)', 'smash64'),
  ('1999-11-19', 'Super Smash Bros. comes out in Europe (Nintendo 64)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._(video_game)', 'smash64'),
  ('2001-11-21', 'Super Smash Bros. Melee comes out in Japan (GameCube)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._Melee', 'melee'),
  ('2001-12-03', 'Super Smash Bros. Melee comes out in North America (GameCube)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._Melee', 'melee'),
  ('2002-05-24', 'Super Smash Bros. Melee comes out in Europe (GameCube)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._Melee', 'melee'),
  ('2008-01-31', 'Super Smash Bros. Brawl comes out in Japan (Wii)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._Brawl', 'brawl'),
  ('2008-03-09', 'Super Smash Bros. Brawl comes out in North America (Wii)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._Brawl', 'brawl'),
  ('2008-06-27', 'Super Smash Bros. Brawl comes out in Europe (Wii)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._Brawl', 'brawl'),
  ('2011-02-07', 'The first public demo of Project M comes out', 'https://en.wikipedia.org/wiki/Project_M', 'pplus'),
  ('2013-12-09', 'Project M 3.0 comes out', 'https://en.wikipedia.org/wiki/Project_M', 'pplus'),
  ('2014-09-13', 'Super Smash Bros. for Nintendo 3DS comes out in Japan', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._for_Nintendo_3DS_and_Wii_U', 'smash4'),
  ('2014-10-03', 'Super Smash Bros. for Nintendo 3DS comes out in North America and Europe', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._for_Nintendo_3DS_and_Wii_U', 'smash4'),
  ('2014-11-21', 'Super Smash Bros. for Wii U comes out in North America', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._for_Nintendo_3DS_and_Wii_U', 'smash4'),
  ('2014-11-28', 'Super Smash Bros. for Wii U comes out in Europe', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._for_Nintendo_3DS_and_Wii_U', 'smash4'),
  ('2014-12-06', 'Super Smash Bros. for Wii U comes out in Japan', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._for_Nintendo_3DS_and_Wii_U', 'smash4'),
  ('2015-12-01', 'The Project M team announces the end of its development', 'https://en.wikipedia.org/wiki/Project_M', 'pplus'),
  ('2018-12-07', 'Super Smash Bros. Ultimate comes out worldwide (Nintendo Switch)', 'https://en.wikipedia.org/wiki/Super_Smash_Bros._Ultimate', 'ultimate')
) as v (happened_on, title, link, game)
where not exists (
  select 1 from public.history_moments m where m.happened_on = v.happened_on::date and m.title = v.title
);
