-- Smash history: Project M majors from 2017 on (docs/archive-plan.md). start.gg files Project M as its own
-- game (2); Matthew chose to file it under P+ (2026-11-16), and Smashy now reads it as P+ (src/lib/games.ts).
-- Adds the Project M majors from Liquipedia's list that round 540 had to leave out (each found on start.gg by
-- exact address, dates agreeing; read-only, 2026-11-19), and gives P+ to four majors added then whose
-- Project M brackets weren't read, clearing their saved-results mark so the daily fill saves those brackets
-- too. Safe to run twice.

insert into public.majors (slug, name, start_at, end_at, games, entrants, city, country, image_url, timezone, source, hidden)
select v.slug, v.name, v.start_at::timestamptz, v.end_at::timestamptz, v.games, v.entrants::int, v.city, v.country, v.image_url, v.timezone, 'admin', false
from (values
  ('blacklisted-5', 'Blacklisted 5', '2019-06-22T15:00:00.000Z', '2019-06-24T03:00:00.000Z', array['pplus']::text[], 109, 'Waltham', 'US', 'https://images.start.gg/images/tournament/133209/image-aef7e6085af7ab3b395a85dfa37b1c42.png?ehk=ewGnoZFMZb4hF74Ykozp8TkMU1Z3esVnpZlBBnS0jRc%3D&ehkOptimized=ESIrl6LLLhFjsDRIQbebR2S8Cuic9%2BFFYaTqWBI3xyA%3D', 'America/New_York'),
  ('blacklisted-4', 'Blacklisted 4', '2018-10-27T15:00:00.000Z', '2018-10-29T03:59:00.000Z', array['pplus']::text[], 137, 'Waltham', 'US', 'https://images.start.gg/images/tournament/57048/image-d9767c9ef1285eb74b71e6a27b9b47db.png?ehk=QvNoRNtIThmoQfAU1tUlwdFsw6PdZsJrTLqWf8FofOo%3D&ehkOptimized=ERbd0iN2kUdJx0X5KhZMwT85QN2DoYmC7cY4ADn2%2Bzo%3D', 'America/New_York'),
  ('the-flex-zone-3', 'The Flex Zone 3', '2018-04-07T14:00:00.000Z', '2018-04-08T03:59:00.000Z', array['pplus']::text[], 93, 'Deer Park', 'US', 'https://images.start.gg/images/tournament/31991/image-f267cbf09440a65a1212c6442d982a43.png', 'America/New_York'),
  ('fair-and-balanced', 'Fair and Balanced', '2017-11-18T18:00:00.000Z', '2017-11-19T07:59:59.000Z', array['pplus']::text[], 96, 'Santa Clara', 'US', 'https://images.start.gg/images/tournament/12244/image-119e26d244427faa2035e1080a58008a.jpg?ehk=ozsII7IsC98orNBuOqNgHbOloxh8lz%2FrFVzArxqRKPw%3D&ehkOptimized=9jQL9Oz8BPgfi7HPUcBYxhFoeipv0QoxsEDXgr7DE1E%3D', 'America/Los_Angeles'),
  ('supernova-2-2-day-project-m-national', 'Supernova 2: 2-Day Project M National', '2017-07-29T15:00:00.000Z', '2017-07-31T03:59:00.000Z', array['pplus']::text[], 173, 'Deer Park', 'US', 'https://images.start.gg/images/tournament/8485/image-2e188a3373febf33b7cde041b2ee93ef.png?ehk=%2BjTp1IrZHgBuk7HnZGoWmt04WvSNhaeMsu7eYPfTndk%3D&ehkOptimized=lcQmNTHFTrMitiiW47oI9LBrwaYjQfk6AS4%2FZl9kD2Q%3D', 'America/New_York'),
  ('blacklisted-3', 'Blacklisted 3', '2017-07-01T04:00:00.000Z', '2017-07-03T03:59:00.000Z', array['pplus']::text[], 192, 'Natick', 'US', 'https://images.start.gg/images/tournament/8688/image-749aeb5e044f5b8b66e3cff1a23daa4f.jpg?ehk=NDzmQwVqqhRYZ4Bwi3xMR4iN3xazUSVo0HVtdzIMwNk%3D&ehkOptimized=GHQ46bx9u8L1m5qusoL%2BZkUIINaRVYI8YcYEnXg1wOQ%3D', 'America/New_York'),
  ('the-flex-zone-2', 'The Flex Zone 2', '2017-02-18T14:00:00.000Z', '2017-02-20T04:00:00.000Z', array['pplus']::text[], 129, 'Deer Park', 'US', null, 'America/New_York')
) as v(slug, name, start_at, end_at, games, entrants, city, country, image_url, timezone)
on conflict (slug) do nothing;

update public.majors m
set games = v.games, entrants = greatest(coalesce(m.entrants, 0), v.entrants::int), results_saved_at = null, updated_at = now()
from (values
  ('the-encore', array['melee', 'pplus']::text[], 93),
  ('the-even-bigger-balc', array['melee', 'pplus', 'smash64']::text[], 427),
  ('we-tech-those-3', array['melee', 'pplus']::text[], 194),
  ('the-bigger-balc', array['melee', 'pplus']::text[], 372)
) as v(slug, games, entrants)
where m.slug = v.slug;
