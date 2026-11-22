-- Smash history: a name link can hold in one game only (Matthew, 2026-11-19: link the names in Admin). A link
-- joins a name in results added by hand to a start.gg player, and until now it counted in every game: so
-- Smash 4's "ZeRo" and Smash 64's "Zero", or Melee's 2000s "Ken" and a Smash 4 "KEN", couldn't each go to
-- their own player. `game` is '' for a link in every game (all existing links), or the one game it holds in;
-- a game's own link wins over an every-game one. Safe to run twice.

alter table public.player_name_links add column if not exists game text not null default ''
  check (game in ('', 'melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4'));

alter table public.player_name_links drop constraint if exists player_name_links_pkey;
alter table public.player_name_links add primary key (name_key, game);
