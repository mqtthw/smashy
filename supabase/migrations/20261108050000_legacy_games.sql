-- Add the older games: Smash 64 ('smash64'), Brawl ('brawl'), Smash 4 ('smash4').
-- Every column that only allowed melee/ultimate/pplus gets the wider list.

do $$
declare c record;
begin
  -- Drop the old game-list checks (found by what they say, since their names vary).
  for c in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%pplus%'
      and rel.relname in ('profiles', 'posts', 'scenes', 'rulesets', 'event_rulesets', 'lobbies', 'chat_messages', 'highlights', 'majors')
  loop
    execute format('alter table public.%I drop constraint %I', c.relname, c.conname);
  end loop;
end $$;

-- Re-add them with all six games.
alter table public.profiles add constraint profiles_games_check
  check (games <@ array['melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4']::text[]);
alter table public.scenes add constraint scenes_games_check
  check (games <@ array['melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4']::text[]);
alter table public.majors add constraint majors_games_check
  check (games <@ array['melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4']::text[]);
alter table public.posts add constraint posts_game_check
  check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4', 'general'));
alter table public.rulesets add constraint rulesets_game_check
  check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4'));
alter table public.lobbies add constraint lobbies_game_check
  check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4'));
alter table public.highlights add constraint highlights_game_check
  check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4'));
alter table public.event_rulesets add constraint event_rulesets_game_check
  check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4'));
alter table public.chat_messages add constraint chat_messages_room_check
  check (room in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4', 'general'));
