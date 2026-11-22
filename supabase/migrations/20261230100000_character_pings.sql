-- Character pings in Play chat (round 448, Matthew's request): typing a character's tag, like @Fox or
-- @CaptainFalcon, in a game's room pings the players who main that character in that game and turned on
-- @matchmaking pings for it. Same limits as @matchmaking: one ping (of either kind) per sender per 30
-- minutes, at most one ping per person per 10 minutes, at most 300 people, blocks and age bands
-- respected. A message that also says @matchmaking pings everyone instead.
-- The tag lists come from src/lib/characters.ts (a tag is the character key without hyphens); keep them
-- in step with src/lib/characterTags.ts.

-- Tag -> character key for one game.
create or replace function private.character_tags(g text) returns jsonb
  language sql immutable set search_path = ''
as $$
  select case g
    when 'melee' then '{"bowser": "bowser", "captainfalcon": "captain-falcon", "donkeykong": "donkey-kong", "drmario": "dr-mario", "falco": "falco", "fox": "fox", "ganondorf": "ganondorf", "iceclimbers": "ice-climbers", "jigglypuff": "jigglypuff", "kirby": "kirby", "link": "link", "luigi": "luigi", "mario": "mario", "marth": "marth", "mewtwo": "mewtwo", "mrgameandwatch": "mr-game-and-watch", "ness": "ness", "peach": "peach", "pichu": "pichu", "pikachu": "pikachu", "roy": "roy", "samus": "samus", "sheik": "sheik", "yoshi": "yoshi", "younglink": "young-link", "zelda": "zelda"}'::jsonb
    when 'ultimate' then '{"banjoandkazooie": "banjo-and-kazooie", "bayonetta": "bayonetta", "bowser": "bowser", "bowserjr": "bowser-jr", "byleth": "byleth", "captainfalcon": "captain-falcon", "chrom": "chrom", "cloud": "cloud", "corrin": "corrin", "daisy": "daisy", "darkpit": "dark-pit", "darksamus": "dark-samus", "diddykong": "diddy-kong", "donkeykong": "donkey-kong", "drmario": "dr-mario", "duckhunt": "duck-hunt", "falco": "falco", "fox": "fox", "ganondorf": "ganondorf", "greninja": "greninja", "hero": "hero", "iceclimbers": "ice-climbers", "ike": "ike", "incineroar": "incineroar", "inkling": "inkling", "isabelle": "isabelle", "jigglypuff": "jigglypuff", "joker": "joker", "kazuya": "kazuya", "ken": "ken", "kingdedede": "king-dedede", "kingkrool": "king-k-rool", "kirby": "kirby", "link": "link", "littlemac": "little-mac", "lucario": "lucario", "lucas": "lucas", "lucina": "lucina", "luigi": "luigi", "mario": "mario", "marth": "marth", "megaman": "mega-man", "metaknight": "meta-knight", "mewtwo": "mewtwo", "miibrawler": "mii-brawler", "miigunner": "mii-gunner", "miiswordfighter": "mii-swordfighter", "minmin": "min-min", "mrgameandwatch": "mr-game-and-watch", "ness": "ness", "olimar": "olimar", "pacman": "pac-man", "palutena": "palutena", "peach": "peach", "pichu": "pichu", "pikachu": "pikachu", "piranhaplant": "piranha-plant", "pit": "pit", "pokemontrainer": "pokemon-trainer", "pyraandmythra": "pyra-and-mythra", "rob": "rob", "richter": "richter", "ridley": "ridley", "robin": "robin", "rosalinaandluma": "rosalina-and-luma", "roy": "roy", "ryu": "ryu", "samus": "samus", "sephiroth": "sephiroth", "sheik": "sheik", "shulk": "shulk", "simon": "simon", "snake": "snake", "sonic": "sonic", "sora": "sora", "steve": "steve", "terry": "terry", "toonlink": "toon-link", "villager": "villager", "wario": "wario", "wiifittrainer": "wii-fit-trainer", "wolf": "wolf", "yoshi": "yoshi", "younglink": "young-link", "zelda": "zelda", "zerosuitsamus": "zero-suit-samus"}'::jsonb
    when 'pplus' then '{"bowser": "bowser", "captainfalcon": "captain-falcon", "charizard": "charizard", "diddykong": "diddy-kong", "donkeykong": "donkey-kong", "falco": "falco", "fox": "fox", "ganondorf": "ganondorf", "iceclimbers": "ice-climbers", "ike": "ike", "ivysaur": "ivysaur", "jigglypuff": "jigglypuff", "kingdedede": "king-dedede", "kirby": "kirby", "knuckles": "knuckles", "link": "link", "lucario": "lucario", "lucas": "lucas", "luigi": "luigi", "mario": "mario", "marth": "marth", "metaknight": "meta-knight", "mewtwo": "mewtwo", "mrgameandwatch": "mr-game-and-watch", "ness": "ness", "olimar": "olimar", "peach": "peach", "pikachu": "pikachu", "pit": "pit", "rob": "rob", "roy": "roy", "samus": "samus", "sheik": "sheik", "snake": "snake", "sonic": "sonic", "squirtle": "squirtle", "toonlink": "toon-link", "wario": "wario", "wolf": "wolf", "yoshi": "yoshi", "zelda": "zelda", "zerosuitsamus": "zero-suit-samus"}'::jsonb
    when 'smash64' then '{"captainfalcon": "captain-falcon", "donkeykong": "donkey-kong", "fox": "fox", "jigglypuff": "jigglypuff", "kirby": "kirby", "link": "link", "luigi": "luigi", "mario": "mario", "ness": "ness", "pikachu": "pikachu", "samus": "samus", "yoshi": "yoshi"}'::jsonb
    when 'brawl' then '{"bowser": "bowser", "captainfalcon": "captain-falcon", "diddykong": "diddy-kong", "donkeykong": "donkey-kong", "falco": "falco", "fox": "fox", "ganondorf": "ganondorf", "iceclimbers": "ice-climbers", "ike": "ike", "jigglypuff": "jigglypuff", "kingdedede": "king-dedede", "kirby": "kirby", "link": "link", "lucario": "lucario", "lucas": "lucas", "luigi": "luigi", "mario": "mario", "marth": "marth", "metaknight": "meta-knight", "mrgameandwatch": "mr-game-and-watch", "ness": "ness", "olimar": "olimar", "peach": "peach", "pikachu": "pikachu", "pit": "pit", "pokemontrainer": "pokemon-trainer", "rob": "rob", "samus": "samus", "sheik": "sheik", "snake": "snake", "sonic": "sonic", "toonlink": "toon-link", "wario": "wario", "wolf": "wolf", "yoshi": "yoshi", "zelda": "zelda", "zerosuitsamus": "zero-suit-samus"}'::jsonb
    when 'smash4' then '{"bayonetta": "bayonetta", "bowser": "bowser", "bowserjr": "bowser-jr", "captainfalcon": "captain-falcon", "charizard": "charizard", "cloud": "cloud", "corrin": "corrin", "darkpit": "dark-pit", "diddykong": "diddy-kong", "donkeykong": "donkey-kong", "drmario": "dr-mario", "duckhunt": "duck-hunt", "falco": "falco", "fox": "fox", "ganondorf": "ganondorf", "greninja": "greninja", "ike": "ike", "jigglypuff": "jigglypuff", "kingdedede": "king-dedede", "kirby": "kirby", "link": "link", "littlemac": "little-mac", "lucario": "lucario", "lucas": "lucas", "lucina": "lucina", "luigi": "luigi", "mario": "mario", "marth": "marth", "megaman": "mega-man", "metaknight": "meta-knight", "mewtwo": "mewtwo", "miibrawler": "mii-brawler", "miigunner": "mii-gunner", "miiswordfighter": "mii-swordfighter", "mrgameandwatch": "mr-game-and-watch", "ness": "ness", "olimar": "olimar", "pacman": "pac-man", "palutena": "palutena", "peach": "peach", "pikachu": "pikachu", "pit": "pit", "rob": "rob", "robin": "robin", "rosalinaandluma": "rosalina-and-luma", "roy": "roy", "ryu": "ryu", "samus": "samus", "sheik": "sheik", "shulk": "shulk", "sonic": "sonic", "toonlink": "toon-link", "villager": "villager", "wario": "wario", "wiifittrainer": "wii-fit-trainer", "yoshi": "yoshi", "zelda": "zelda", "zerosuitsamus": "zero-suit-samus"}'::jsonb
    else '{}'::jsonb
  end;
$$;
revoke all on function private.character_tags(text) from public;

-- The chat's contact-info rule reads @matchmaking and character tags as plain words (not social media
-- handles); every other "@name" is still refused. Loosens the rule, so every stored message still passes.
create or replace function private.chat_text_for_check(t text) returns text
  language sql immutable set search_path = ''
as $$
  select regexp_replace(t, '@(matchmaking|banjoandkazooie|bayonetta|bowser|bowserjr|byleth|captainfalcon|charizard|chrom|cloud|corrin|daisy|darkpit|darksamus|diddykong|donkeykong|drmario|duckhunt|falco|fox|ganondorf|greninja|hero|iceclimbers|ike|incineroar|inkling|isabelle|ivysaur|jigglypuff|joker|kazuya|ken|kingdedede|kingkrool|kirby|knuckles|link|littlemac|lucario|lucas|lucina|luigi|mario|marth|megaman|metaknight|mewtwo|miibrawler|miigunner|miiswordfighter|minmin|mrgameandwatch|ness|olimar|pacman|palutena|peach|pichu|pikachu|piranhaplant|pit|pokemontrainer|pyraandmythra|richter|ridley|rob|robin|rosalinaandluma|roy|ryu|samus|sephiroth|sheik|shulk|simon|snake|sonic|sora|squirtle|steve|terry|toonlink|villager|wario|wiifittrainer|wolf|yoshi|younglink|zelda|zerosuitsamus)(?![A-Za-z0-9_]|\.[A-Za-z0-9])', '\1', 'gi');
$$;
revoke all on function private.chat_text_for_check(text) from public;
grant execute on function private.chat_text_for_check(text) to anon, authenticated;

-- New alert type: someone tagged a character you main.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder', 'weekly_digest', 'set_ready', 'event_result',
  'event_update', 'ladder_match', 'play_ping', 'play_request', 'play_accepted', 'play_ping_main'
));

create or replace function private.push_notification() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.type in ('reply', 'mention', 'quote', 'follow', 'follow_request', 'follow_accepted', 'message_request', 'major_live', 'event_reminder', 'set_ready', 'event_result', 'event_update', 'ladder_match', 'play_ping', 'play_request', 'play_accepted', 'play_ping_main') then
    perform private.request_push('notification', new.id);
  end if;
  return null;
end;
$$;

-- The chat trigger: @matchmaking pings everyone with pings on; otherwise up to 3 character tags ping the
-- players who main one of them. event_name is the room (game); event_href opens that room and names the
-- character the receiver mains (&char=key), so the alert can say which one.
create or replace function private.after_chat_matchmaking() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  band text;
  tags jsonb;
  chars text[] := '{}';
  w text;
begin
  if new.room = 'general' then return null; end if;

  if new.body ~* '(^|[^A-Za-z0-9_])@matchmaking([^A-Za-z0-9_]|$)' then
    insert into public.play_settings (user_id, last_ping_at) values (new.author_id, now())
      on conflict (user_id) do update set last_ping_at = now()
      where play_settings.last_ping_at is null or play_settings.last_ping_at < now() - interval '30 minutes';
    if not found then return null; end if;
    band := private.age_band(new.author_id);
    insert into public.notifications (user_id, actor_id, type, event_name, event_href)
      select s.user_id, new.author_id, 'play_ping', new.room, '/play?room=' || new.room
      from public.play_settings s
      where new.room = any (s.ping_games)
        and s.user_id <> new.author_id
        and not private.is_blocked(s.user_id, new.author_id)
        and private.age_band(s.user_id) = band
        and not exists (select 1 from public.notifications n
                        where n.user_id = s.user_id and n.type in ('play_ping', 'play_ping_main') and n.created_at > now() - interval '10 minutes')
      limit 300;
    return null;
  end if;

  -- Character tags for this room's game, in the order typed, at most 3.
  tags := private.character_tags(new.room);
  for w in select lower(m[1]) from regexp_matches(new.body, '(?:^|[^A-Za-z0-9_])@([A-Za-z0-9]+)(?![A-Za-z0-9_])', 'g') as m loop
    if tags ? w and not ((tags ->> w) = any (chars)) then
      chars := chars || (tags ->> w);
      exit when cardinality(chars) >= 3;
    end if;
  end loop;
  if cardinality(chars) = 0 then return null; end if;

  insert into public.play_settings (user_id, last_ping_at) values (new.author_id, now())
    on conflict (user_id) do update set last_ping_at = now()
    where play_settings.last_ping_at is null or play_settings.last_ping_at < now() - interval '30 minutes';
  if not found then return null; end if;
  band := private.age_band(new.author_id);
  insert into public.notifications (user_id, actor_id, type, event_name, event_href)
    select s.user_id, new.author_id, 'play_ping_main', new.room, '/play?room=' || new.room || '&char=' || hit.ch
    from public.play_settings s
    join public.profiles p on p.id = s.user_id
    cross join lateral (
      select c.ch from unnest(chars) with ordinality as c(ch, i)
      where p.mains @> jsonb_build_array(jsonb_build_object('game', new.room, 'character', c.ch))
      order by c.i limit 1
    ) hit
    where new.room = any (s.ping_games)
      and s.user_id <> new.author_id
      and not private.is_blocked(s.user_id, new.author_id)
      and private.age_band(s.user_id) = band
      and not exists (select 1 from public.notifications n
                      where n.user_id = s.user_id and n.type in ('play_ping', 'play_ping_main') and n.created_at > now() - interval '10 minutes')
    limit 300;
  return null;
end;
$$;
