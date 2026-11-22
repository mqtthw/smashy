-- Round 652 (Matthew: "many events listed as Brawl that are actually p+"). These P+ majors filed their
-- events under start.gg's Brawl game (named '"Brawl" Singles', or "Brawl :)" at Smash Camp), so Smash
-- history showed them as Brawl. New ones are caught by gameOfEvent (src/lib/games.ts); this moves the
-- ones already saved. Checked by hand on 2026-11-21: P+ players in every top 8 (SipMastah, Ryzuul,
-- RapMonster, SoulOfficer, Nezergy...). Real Brawl majors (Supernova, Super Smash Con, Monarch, Genesis)
-- are left alone.

with p(slug) as (values
  ('blacklisted-9-blacklisted-forever'),
  ('deep-space-tussle'),
  ('flash-flood'),
  ('run-don-t-walk-2026-1-000-in-pot-bonuses'),
  ('show-me-your-moves-26'),
  ('tussle-thru-time'),
  ('uprooted-2025'),
  ('smash-camp-2025')
)
update public.major_events e set game = 'pplus' from p where e.major_slug = p.slug and e.game = 'brawl';

with p(slug) as (values
  ('blacklisted-9-blacklisted-forever'), ('deep-space-tussle'), ('flash-flood'),
  ('run-don-t-walk-2026-1-000-in-pot-bonuses'), ('show-me-your-moves-26'), ('tussle-thru-time'),
  ('uprooted-2025'), ('smash-camp-2025')
)
update public.major_sets s set game = 'pplus' from p where s.major_slug = p.slug and s.game = 'brawl';

with p(slug) as (values
  ('blacklisted-9-blacklisted-forever'), ('deep-space-tussle'), ('flash-flood'),
  ('run-don-t-walk-2026-1-000-in-pot-bonuses'), ('show-me-your-moves-26'), ('tussle-thru-time'),
  ('uprooted-2025'), ('smash-camp-2025')
)
update public.major_vods v set game = 'pplus' from p where v.major_slug = p.slug and v.game = 'brawl';

-- The major's game list: Brawl becomes P+, kept in Smashy's usual order.
with p(slug) as (values
  ('blacklisted-9-blacklisted-forever'), ('deep-space-tussle'), ('flash-flood'),
  ('run-don-t-walk-2026-1-000-in-pot-bonuses'), ('show-me-your-moves-26'), ('tussle-thru-time'),
  ('uprooted-2025'), ('smash-camp-2025')
)
update public.majors m
set games = (
  select array_agg(g order by array_position(array['melee','ultimate','pplus','smash64','brawl','smash4'], g))
  from (select distinct unnest(array_replace(m.games, 'brawl', 'pplus')) as g) x
)
from p
where m.slug = p.slug and 'brawl' = any(m.games);
