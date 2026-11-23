-- Smash history: old Smash 64 majors' sets (2009-2014), read by hand from Liquipedia (round 734's way; Matthew,
-- 2026-11-22: "Continue"): bracket pages for Apex 2012-2014 and Zenith 2014; the top 8 (single elimination, with a
-- 3rd place match) the pages of the Japanese Kanto, Kansai and Osaka University events keep; Tacna 2014's last two
-- sets. Scores as Liquipedia lists them; forfeits left out. 2nd Kansai's page has no bracket. Made with
-- tools/liquipedia/bracket-to-sql.mjs from tools/liquipedia/brackets/2008-2014-smash64.txt. Safe to run twice.

-- manual/2012-apex-2012 (smash64): 125 sets, from https://liquipedia.net/smash/Apex/2012/64/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2012-apex-2012|manual-smash64-2|1', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 10, 'Isai', null, 'george', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|2', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 20, 'Marko', null, 'Duck', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|3', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 30, 'Chain-Ace', null, 'Xaltis', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|4', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 40, 'Clubbadubba', null, 'Black Cats31', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|5', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 50, 'Kefit', null, 'Xiivi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|6', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 60, 'Ripple', null, 'Codi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|7', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 70, 'Krazy Kirby', null, 'pikathunder', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|8', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 80, 'Firo', null, 'Dark Master', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|9', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 90, 'JaimeHR', null, 'P90curl', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|10', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 100, 'Vudujin', null, 'Homeland', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|11', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 110, 'Vex Kasrani', null, '~Tac~', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|12', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 120, 'm3gav01t', null, 'What''s the Point', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|13', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 130, 'King Funk', null, 'Tony', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|14', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 140, 'xivk & Jokaru', null, 'KnitePhox', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|15', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 150, 'Valoem', null, 'Zaatar Manakish', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|16', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 160, 'Jimmy Joe', null, 'jwillii', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|17', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 170, 'Sensei', null, 'Glen Cocoa', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|18', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 180, 'Ray Rocket', null, 'KeroKeroppi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|19', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 190, 'VaNz', null, 'pidgezero_one', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|20', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 200, 'hamburglar', null, 'pwii', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|21', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 210, 'Smoke2Jointz', null, 'JohnsterMonzter', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|22', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 220, 'Rocky', null, 'Seagull', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|23', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 230, 'Jel', null, 'Tedium', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|24', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 240, 'Luigi Sama', null, 'Espy', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|25', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 250, 'Nintendude', null, 'gio', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|26', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 260, 'Tearbear', null, 'Hard B0dy', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|27', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 270, 'Vatgas', null, 'infamous diablo', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|28', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 280, 'Bladewise', null, 'TheSaberGuy', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|29', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 290, 'SuPeRbOoMfAn', null, 'Deltacod', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|30', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 300, 'THuGz', null, 'Lefty', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|31', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 310, 'Ownasaurus', null, 'AIR', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|32', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 320, 'KoRoBeNiKi', null, 'Garm', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|33', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 330, 'Isai', null, 'Duck', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|34', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 340, 'Xaltis', null, 'Clubbadubba', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|35', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 350, 'Kefit', null, 'Ripple', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|36', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 360, 'Krazy Kirby', null, 'Firo', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|37', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 370, 'JaimeHR', null, 'Vudujin', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|38', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 380, '~Tac~', null, 'm3gav01t', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|39', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 390, 'King Funk', null, 'KnitePhox', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|40', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 400, 'Valoem', null, 'Jimmy Joe', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|41', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 410, 'Sensei', null, 'Ray Rocket', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|42', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 420, 'VaNz', null, 'hamburglar', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|43', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 430, 'JohnsterMonzter', null, 'Rocky', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|44', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 440, 'Jel', null, 'Espy', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|45', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 450, 'Nintendude', null, 'Hard B0dy', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|46', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 460, 'infamous diablo', null, 'Bladewise', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|47', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 470, 'SuPeRbOoMfAn', null, 'THuGz', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|48', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 480, 'Ownasaurus', null, 'KoRoBeNiKi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|49', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 490, 'Isai', 2, 'Clubbadubba', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|50', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 500, 'Kefit', 2, 'Firo', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|51', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 510, 'JaimeHR', null, 'm3gav01t', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|52', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 520, 'King Funk', 2, 'Valoem', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|53', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 530, 'Sensei', null, 'hamburglar', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|54', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 540, 'Rocky', null, 'Jel', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|55', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 550, 'Nintendude', null, 'Bladewise', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|56', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 560, 'SuPeRbOoMfAn', 2, 'Ownasaurus', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|57', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 4', 570, 'Isai', 2, 'Kefit', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|58', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 4', 580, 'JaimeHR', 2, 'King Funk', 1, 1),
  ('manual/2012-apex-2012|manual-smash64-2|59', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 4', 590, 'Sensei', 2, 'Jel', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|60', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 4', 600, 'Nintendude', 0, 'SuPeRbOoMfAn', 2, 2),
  ('manual/2012-apex-2012|manual-smash64-2|61', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 5', 610, 'Isai', 3, 'JaimeHR', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|62', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 5', 620, 'Sensei', 0, 'SuPeRbOoMfAn', 3, 2),
  ('manual/2012-apex-2012|manual-smash64-2|63', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 630, 'george', null, 'Marko', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|64', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 640, 'Chain-Ace', null, 'Black Cats31', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|65', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 650, 'Xiivi', null, 'Codi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|66', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 660, 'pikathunder', null, 'Dark Master', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|67', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 670, 'P90curl', null, 'Homeland', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|68', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 680, 'Vex Kasrani', null, 'What''s the Point', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|69', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 690, 'Tony', null, 'xivk & Jokaru', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|70', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 700, 'Zaatar Manakish', null, 'jwillii', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|71', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 710, 'Glen Cocoa', null, 'KeroKeroppi', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|72', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 720, 'pidgezero_one', null, 'pwii', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|73', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 730, 'Smoke2Jointz', null, 'Seagull', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|74', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 740, 'Tedium', null, 'Luigi Sama', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|75', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 750, 'gio', null, 'Tearbear', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|76', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 760, 'Vatgas', null, 'TheSaberGuy', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|77', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 770, 'Deltacod', null, 'Lefty', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|78', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 780, 'AIR', null, 'Garm', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|79', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 790, 'Vudujin', null, 'george', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|80', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 800, '~Tac~', null, 'Chain-Ace', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|81', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 810, 'KnitePhox', null, 'Xiivi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|82', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 820, 'Jimmy Joe', null, 'pikathunder', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|83', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 830, 'Duck', null, 'P90curl', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|84', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 840, 'Xaltis', null, 'Vex Kasrani', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|85', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 850, 'Ripple', null, 'Tony', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|86', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 860, 'Krazy Kirby', null, 'jwillii', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|87', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 870, 'Hard B0dy', null, 'KeroKeroppi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|88', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 880, 'infamous diablo', null, 'pwii', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|89', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 890, 'THuGz', null, 'Seagull', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|90', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 900, 'KoRoBeNiKi', null, 'Luigi Sama', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|91', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 910, 'Ray Rocket', null, 'gio', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|92', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 920, 'VaNz', null, 'Vatgas', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|93', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 930, 'JohnsterMonzter', null, 'Deltacod', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|94', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 940, 'Espy', null, 'AIR', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|95', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 950, 'george', null, 'Chain-Ace', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|96', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 960, 'KnitePhox', null, 'Jimmy Joe', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|97', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 970, 'P90curl', null, 'Vex Kasrani', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|98', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 980, 'Tony', null, 'Krazy Kirby', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|99', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 990, 'Hard B0dy', null, 'infamous diablo', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|100', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 1000, 'THuGz', null, 'KoRoBeNiKi', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|101', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 1010, 'gio', null, 'Vatgas', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|102', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 1020, 'JohnsterMonzter', null, 'Espy', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|103', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1030, 'Rocky', null, 'Chain-Ace', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|104', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1040, 'hamburglar', null, 'KnitePhox', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|105', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1050, 'Ownasaurus', null, 'Vex Kasrani', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|106', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1060, 'Bladewise', null, 'Krazy Kirby', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|107', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1070, 'Firo', null, 'Hard B0dy', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|108', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1080, 'Clubbadubba', null, 'KoRoBeNiKi', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|109', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1090, 'Valoem', null, 'gio', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|110', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 1100, 'm3gav01t', null, 'Espy', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|111', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 1110, 'Rocky', null, 'KnitePhox', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|112', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 1120, 'Ownasaurus', null, 'Krazy Kirby', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|113', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 1130, 'Firo', 2, 'Clubbadubba', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|114', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 1140, 'Valoem', null, 'm3gav01t', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|115', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 1150, 'King Funk', 2, 'KnitePhox', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|116', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 1160, 'Kefit', null, 'Ownasaurus', null, 1),
  ('manual/2012-apex-2012|manual-smash64-2|117', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 1170, 'Nintendude', 2, 'Firo', 1, 1),
  ('manual/2012-apex-2012|manual-smash64-2|118', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 1180, 'Jel', null, 'm3gav01t', null, 2),
  ('manual/2012-apex-2012|manual-smash64-2|119', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 7', 1190, 'King Funk', 1, 'Kefit', 2, 2),
  ('manual/2012-apex-2012|manual-smash64-2|120', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 7', 1200, 'Nintendude', 2, 'm3gav01t', 0, 1),
  ('manual/2012-apex-2012|manual-smash64-2|121', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 8', 1210, 'Sensei', 2, 'Kefit', 3, 2),
  ('manual/2012-apex-2012|manual-smash64-2|122', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 8', 1220, 'JaimeHR', 3, 'Nintendude', 2, 1),
  ('manual/2012-apex-2012|manual-smash64-2|123', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Finals', 1230, 'Isai', 3, 'JaimeHR', 2, 1),
  ('manual/2012-apex-2012|manual-smash64-2|124', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Grand Finals', 1240, 'SuPeRbOoMfAn', 3, 'Isai', 4, 2),
  ('manual/2012-apex-2012|manual-smash64-2|125', 'manual/2012-apex-2012', 'manual-smash64-2', 'smash64', 'Bracket', 'Grand Finals (reset)', 1250, 'SuPeRbOoMfAn', 4, 'Isai', 2, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2013-apex-2013 (smash64): 103 sets, from https://liquipedia.net/smash/Apex/2013/64/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2013-apex-2013|manual-smash64-2|1', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Quarterfinals', 10, 'SuPeRbOoMfAn', 2, 'Sensei', 1, 1),
  ('manual/2013-apex-2013|manual-smash64-2|2', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Kefit', 0, 'Kikoushi', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|3', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Isai', 2, 'Nangoku', 0, 1),
  ('manual/2013-apex-2013|manual-smash64-2|4', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Quarterfinals', 40, 'JaimeHR', 1, 'Ruoka Dancho', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|5', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Semifinals', 50, 'SuPeRbOoMfAn', 1, 'Kikoushi', 3, 2),
  ('manual/2013-apex-2013|manual-smash64-2|6', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Semifinals', 60, 'Isai', 3, 'Ruoka Dancho', 0, 1),
  ('manual/2013-apex-2013|manual-smash64-2|7', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 70, 'runtmc', null, 'Shaolinblunts', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|8', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 80, 'Cobrevolution', null, 'SmashAssassin', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|9', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 90, 'Skyfire', null, 'Sonofabeast', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|10', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 100, 'vVv Rapture', null, 'ezeffort', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|11', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 110, 'TO Joe', null, 'pidgezero_one', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|12', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 120, 'Black Cats31', null, 'Bobbo', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|13', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 130, 'Rami Jackson', null, 'Kuraudo', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|14', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 140, 'KMaD64', null, 'Tearbear', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|15', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 150, 'BOSSMAN', null, 'HammerTime', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|16', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 160, 'KoRoBeNiKi', null, 'Ya Dad', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|17', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 170, 'Sandman', null, 'Weedwack', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|18', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 180, 'hectorhertz', null, 'Maliki', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|19', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 190, 'Apple', null, 'kpkoopa', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|20', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 200, 'Chain-Ace', null, 'DeAnMoNeY540', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|21', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 210, 'Gunblade', null, 'jeffboy', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|22', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 220, 'I LOVE SMASH', null, 'shyguy88', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|23', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 230, 'DJ Fliphop', null, 'Sweet', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|24', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 240, 'Eikelmann', null, 'Orange', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|25', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 250, 'SA-in-NE', null, 'ook', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|26', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 260, 'Jel', null, 'GTZ', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|27', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 270, 'cmu6eh', null, 'Rayzor', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|28', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 280, 'low-tier-or-no-tier', null, 'Bred', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|29', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 290, 'Danconia', null, 'USCTrojanTB', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|30', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 300, 'Wizzrobe', null, 'Rich Brown', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|31', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 310, 'Eggcelsior!', null, 'GINGTASTIC', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|32', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 320, 'Bladewise', null, 'Kenny', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|33', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 330, 'Triptych', null, 'Zwarm', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|34', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 340, 'Tony', null, 'Dice', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|35', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 350, 'Myztek', null, 'HazarD2kv', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|36', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 360, 'Komonotono', null, 'Deano', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|37', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 370, 'faceCHEEKwall', null, 'Smokey Bluntz', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|38', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 1', 380, 'Jered', null, 'Cookie Monster', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|39', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 390, 'runtmc', null, 'Cobrevolution', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|40', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 400, 'Skyfire', null, 'vVv Rapture', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|41', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 410, 'TO Joe', null, 'Black Cats31', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|42', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 420, 'Kuraudo', null, 'KMaD64', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|43', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 430, 'HammerTime', null, 'KoRoBeNiKi', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|44', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 440, 'Weedwack', null, 'hectorhertz', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|45', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 450, 'Apple', null, 'Chain-Ace', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|46', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 460, 'Gunblade', null, 'I LOVE SMASH', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|47', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 470, 'DJ Fliphop', null, 'Eikelmann', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|48', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 480, 'SA-in-NE', null, 'Jel', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|49', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 490, 'cmu6eh', null, 'low-tier-or-no-tier', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|50', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 500, 'Danconia', null, 'Wizzrobe', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|51', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 510, 'Eggcelsior!', null, 'Bladewise', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|52', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 520, 'Zwarm', null, 'Tony', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|53', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 530, 'HazarD2kv', null, 'Komonotono', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|54', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 540, 'faceCHEEKwall', null, 'Jered', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|55', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 550, 'Dark Link -X-', null, 'Cobrevolution', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|56', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 560, 'KnitePhox', null, 'Skyfire', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|57', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 570, 'Jimmy Joe', null, 'Black Cats31', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|58', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 580, 'Han Solo', null, 'KMaD64', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|59', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 590, 'Vex Kasrani', null, 'KoRoBeNiKi', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|60', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 600, 'Oxolane', null, 'Weedwack', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|61', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 610, 'Combo Blaze', null, 'Chain-Ace', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|62', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 620, 'Stranded', null, 'I LOVE SMASH', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|63', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 630, 'Rumbly', null, 'DJ Fliphop', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|64', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 640, 'Valoem', null, 'SA-in-NE', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|65', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 650, 'Madrush21', null, 'cmu6eh', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|66', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 660, 'ballin4life', null, 'Wizzrobe', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|67', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 670, 'TANK', null, 'Bladewise', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|68', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 680, 'B-Rex', null, 'Tony', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|69', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 690, 'ShadeMoneh', null, 'Komonotono', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|70', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 700, 'Czar', null, 'faceCHEEKwall', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|71', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 710, 'Dark Link -X-', null, 'KnitePhox', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|72', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 720, 'Jimmy Joe', 1, 'Han Solo', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|73', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 730, 'Vex Kasrani', null, 'Oxolane', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|74', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 740, 'Chain-Ace', null, 'I LOVE SMASH', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|75', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 750, 'Rumbly', null, 'Valoem', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|76', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 760, 'Madrush21', null, 'ballin4life', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|77', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 770, 'TANK', 1, 'B-Rex', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|78', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 780, 'ShadeMoneh', null, 'Czar', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|79', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 790, 'YBOMBB', 2, 'Dark Link -X-', 0, 1),
  ('manual/2013-apex-2013|manual-smash64-2|80', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 800, 'm3gav01t', null, 'Han Solo', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|81', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 810, 'Banze', 2, 'Oxolane', 0, 1),
  ('manual/2013-apex-2013|manual-smash64-2|82', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 820, 'SheerMadness', null, 'I LOVE SMASH', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|83', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 830, 'Firo', null, 'Rumbly', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|84', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 840, 'battlecow', 0, 'ballin4life', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|85', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 850, 'KeroKeroppi', null, 'B-Rex', null, 2),
  ('manual/2013-apex-2013|manual-smash64-2|86', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 860, 'Nintendude', null, 'Czar', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|87', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 870, 'YBOMBB', null, 'm3gav01t', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|88', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 880, 'Banze', 1, 'SheerMadness', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|89', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 890, 'Firo', 2, 'ballin4life', 0, 1),
  ('manual/2013-apex-2013|manual-smash64-2|90', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 900, 'B-Rex', 1, 'Nintendude', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|91', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 7', 910, 'Nangoku', null, 'YBOMBB', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|92', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 7', 920, 'JaimeHR', 2, 'SheerMadness', 0, 1),
  ('manual/2013-apex-2013|manual-smash64-2|93', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 7', 930, 'Sensei', 2, 'Firo', 1, 1),
  ('manual/2013-apex-2013|manual-smash64-2|94', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 7', 940, 'Kefit', 2, 'Nintendude', 1, 1),
  ('manual/2013-apex-2013|manual-smash64-2|95', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 8', 950, 'Nangoku', 0, 'JaimeHR', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|96', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 8', 960, 'Sensei', null, 'Kefit', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|97', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 9', 970, 'SuPeRbOoMfAn', 3, 'JaimeHR', 0, 1),
  ('manual/2013-apex-2013|manual-smash64-2|98', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 9', 980, 'Ruoka Dancho', 3, 'Sensei', 2, 1),
  ('manual/2013-apex-2013|manual-smash64-2|99', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Seventh Place Match', 990, 'Nangoku', 1, 'Kefit', 2, 2),
  ('manual/2013-apex-2013|manual-smash64-2|100', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Fifth Place Match', 1000, 'JaimeHR', null, 'Sensei', null, 1),
  ('manual/2013-apex-2013|manual-smash64-2|101', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Finals', 1010, 'Isai', 3, 'SuPeRbOoMfAn', 1, 1),
  ('manual/2013-apex-2013|manual-smash64-2|102', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Grand Finals', 1020, 'Kikoushi', 0, 'Isai', 3, 2),
  ('manual/2013-apex-2013|manual-smash64-2|103', 'manual/2013-apex-2013', 'manual-smash64-2', 'smash64', 'Bracket', 'Grand Finals (reset)', 1030, 'Kikoushi', 3, 'Isai', 1, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2014-apex-2014 (smash64): 10 sets, from https://liquipedia.net/smash/Apex/2014/64/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2014-apex-2014|manual-smash64-3|1', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Grand Finals', 10, 'Isai', 3, 'Moyashi', 1, 1),
  ('manual/2014-apex-2014|manual-smash64-3|2', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Winners Semifinals', 20, 'Isai', 3, 'Mariguas', 0, 1),
  ('manual/2014-apex-2014|manual-smash64-3|3', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Winners Semifinals', 30, 'Moyashi', 3, 'SuPeRbOoMfAn', 2, 1),
  ('manual/2014-apex-2014|manual-smash64-3|4', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Winners Finals', 40, 'Isai', 3, 'Moyashi', 0, 1),
  ('manual/2014-apex-2014|manual-smash64-3|5', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Losers Round 1', 50, 'tacos', 3, 'Ruoka Dancho', 1, 1),
  ('manual/2014-apex-2014|manual-smash64-3|6', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Losers Round 1', 60, 'JaimeHR', 2, 'Wizzrobe', 3, 2),
  ('manual/2014-apex-2014|manual-smash64-3|7', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Losers Round 2', 70, 'SuPeRbOoMfAn', 3, 'tacos', 0, 1),
  ('manual/2014-apex-2014|manual-smash64-3|8', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Losers Round 2', 80, 'Mariguas', 3, 'Wizzrobe', 1, 1),
  ('manual/2014-apex-2014|manual-smash64-3|9', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Losers Round 3', 90, 'SuPeRbOoMfAn', 3, 'Mariguas', 0, 1),
  ('manual/2014-apex-2014|manual-smash64-3|10', 'manual/2014-apex-2014', 'manual-smash64-3', 'smash64', 'Bracket', 'Losers Finals', 100, 'Moyashi', 3, 'SuPeRbOoMfAn', 1, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2014-zenith-2014 (smash64): 44 sets, from https://liquipedia.net/smash/Zenith/2014/64/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2014-zenith-2014|manual-smash64-2|1', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 10, 'Czar', null, 'KoRoBeNiKi', null, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|2', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 20, 'Nintendude', null, 'Komotonoto', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|3', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 30, 'Killer', null, 'Cobrevolution', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|4', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 40, 'Varazers', null, 'Dominicano', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|5', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 50, 'Battlecow', null, 'Combo Blaze', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|6', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 60, 'Fireblaster', null, 'Maliki', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|7', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 70, 'Herbert Von Karajan', null, 'Shears', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|8', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 1', 80, 'Clubbadubba', null, 'Skyfire', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|9', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 90, 'SuPeRbOoMfAn', null, 'KoRoBeNiKi', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|10', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 100, 'Revan', null, 'Nintendude', null, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|11', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 110, 'KeroKeroppi', 2, 'Killer', 1, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|12', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 120, 'Stranded', null, 'Varazers', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|13', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 130, 'Wizzrobe', null, 'Battlecow', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|14', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 140, 'Firo', 1, 'Fireblaster', 2, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|15', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 150, 'LD', null, 'Herbert Von Karajan', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|16', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 2', 160, 'The Z', 2, 'Clubbadubba', 0, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|17', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 170, 'SuPeRbOoMfAn', 2, 'Nintendude', 0, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|18', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 180, 'KeroKeroppi', 2, 'Stranded', 1, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|19', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 190, 'Wizzrobe', 2, 'Fireblaster', 1, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|20', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 3', 200, 'LD', 0, 'The Z', 2, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|21', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 4', 210, 'SuPeRbOoMfAn', 3, 'KeroKeroppi', 0, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|22', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Winners Round 4', 220, 'Wizzrobe', 3, 'The Z', 2, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|23', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 230, 'Clubbadubba', null, 'Czar', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|24', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 240, 'Herbert Von Karajan', null, 'Komotonoto', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|25', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 250, 'Firo', null, 'Cobrevolution', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|26', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 260, 'Battlecow', null, 'Dominicano', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|27', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 270, 'Varazers', null, 'Combo Blaze', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|28', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 280, 'Killer', null, 'Maliki', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|29', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 290, 'Revan', null, 'Shears', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|30', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 2', 300, 'KoRoBeNiKi', null, 'Skyfire', null, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|31', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 310, 'Clubbadubba', null, 'Herbert Von Karajan', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|32', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 320, 'Firo', null, 'Battlecow', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|33', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 330, 'Varazers', null, 'Killer', null, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|34', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 3', 340, 'Revan', null, 'Skyfire', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|35', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 350, 'Stranded', null, 'Clubbadubba', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|36', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 360, 'Nintendude', null, 'Firo', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|37', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 370, 'LD', null, 'Killer', null, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|38', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 4', 380, 'Fireblaster', null, 'Revan', null, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|39', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 390, 'Stranded', 1, 'Nintendude', 2, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|40', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 5', 400, 'Killer', 2, 'Fireblaster', 1, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|41', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 410, 'The Z', 2, 'Nintendude', 0, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|42', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Round 6', 420, 'KeroKeroppi', 2, 'Killer', 1, 1),
  ('manual/2014-zenith-2014|manual-smash64-2|43', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Losers Finals', 430, 'Wizzrobe', 1, 'KeroKeroppi', 3, 2),
  ('manual/2014-zenith-2014|manual-smash64-2|44', 'manual/2014-zenith-2014', 'manual-smash64-2', 'smash64', 'Bracket', 'Grand Finals', 440, 'SuPeRbOoMfAn', 3, 'KeroKeroppi', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2009-4th-kanto (smash64): 8 sets, from https://liquipedia.net/smash/Kanto/4
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2009-4th-kanto|manual-smash64-1|1', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Tatsuman', 0, 'Jouske', 1, 2),
  ('manual/2009-4th-kanto|manual-smash64-1|2', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Jiima', 0, 'Buchimake Matsuri', 1, 2),
  ('manual/2009-4th-kanto|manual-smash64-1|3', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Moyashi', 1, 'MEGU', 0, 1),
  ('manual/2009-4th-kanto|manual-smash64-1|4', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'Ruoka Dancho', 1, 'FAUST', 0, 1),
  ('manual/2009-4th-kanto|manual-smash64-1|5', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Jouske', 1, 'Buchimake Matsuri', 0, 1),
  ('manual/2009-4th-kanto|manual-smash64-1|6', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Moyashi', 0, 'Ruoka Dancho', 1, 2),
  ('manual/2009-4th-kanto|manual-smash64-1|7', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Jouske', 2, 'Ruoka Dancho', 1, 1),
  ('manual/2009-4th-kanto|manual-smash64-1|8', 'manual/2009-4th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'Buchimake Matsuri', 0, 'Moyashi', 1, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2010-3rd-kansai (smash64): 8 sets, from https://liquipedia.net/smash/Kansai/3
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2010-3rd-kansai|manual-smash64-1|1', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Moyashi', 1, 'S', 0, 1),
  ('manual/2010-3rd-kansai|manual-smash64-1|2', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Kikoushi', 1, 'Ruoka Dancho', 0, 1),
  ('manual/2010-3rd-kansai|manual-smash64-1|3', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Jouske', 1, 'MEGU', 0, 1),
  ('manual/2010-3rd-kansai|manual-smash64-1|4', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'Kei', 1, 'Tatsuman', 0, 1),
  ('manual/2010-3rd-kansai|manual-smash64-1|5', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Moyashi', 1, 'Kikoushi', 0, 1),
  ('manual/2010-3rd-kansai|manual-smash64-1|6', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Jouske', 1, 'Kei', 0, 1),
  ('manual/2010-3rd-kansai|manual-smash64-1|7', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Moyashi', 0, 'Jouske', 2, 2),
  ('manual/2010-3rd-kansai|manual-smash64-1|8', 'manual/2010-3rd-kansai', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'Kikoushi', 0, 'Kei', 1, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2010-5th-kanto (smash64): 8 sets, from https://liquipedia.net/smash/Kanto/5
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2010-5th-kanto|manual-smash64-1|1', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'S', 0, 'Moyashi', 1, 2),
  ('manual/2010-5th-kanto|manual-smash64-1|2', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Kikoushi', 1, 'Kidbell', 0, 1),
  ('manual/2010-5th-kanto|manual-smash64-1|3', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Tsukuru BOY', 1, 'Baata', 0, 1),
  ('manual/2010-5th-kanto|manual-smash64-1|4', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'king', 0, 'Okajyu', 1, 2),
  ('manual/2010-5th-kanto|manual-smash64-1|5', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Moyashi', 1, 'Kikoushi', 0, 1),
  ('manual/2010-5th-kanto|manual-smash64-1|6', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Tsukuru BOY', 0, 'Okajyu', 1, 2),
  ('manual/2010-5th-kanto|manual-smash64-1|7', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Moyashi', 2, 'Okajyu', 1, 1),
  ('manual/2010-5th-kanto|manual-smash64-1|8', 'manual/2010-5th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'Kikoushi', 1, 'Tsukuru BOY', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2010-osaka-university-2010 (smash64): 11 sets, from https://liquipedia.net/smash/Osaka_University/2010
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2010-osaka-university-2010|manual-smash64-1|1', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Round of 16', 10, 'Fukuoka-ken', 1, 'Okajyu', 0, 1),
  ('manual/2010-osaka-university-2010|manual-smash64-1|2', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Round of 16', 20, 'S', 1, 'Hitoshio', 0, 1),
  ('manual/2010-osaka-university-2010|manual-smash64-1|3', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Round of 16', 30, 'Din', 1, 'Tokachi', 0, 1),
  ('manual/2010-osaka-university-2010|manual-smash64-1|4', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Round of 16', 40, 'wario', 0, 'Kikoushi', 1, 2),
  ('manual/2010-osaka-university-2010|manual-smash64-1|5', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 50, 'Ruoka Dancho', 1, 'Fukuoka-ken', 0, 1),
  ('manual/2010-osaka-university-2010|manual-smash64-1|6', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 60, 'S', 1, 'Aran', 0, 1),
  ('manual/2010-osaka-university-2010|manual-smash64-1|7', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 70, 'Ryo', 1, 'Din', 0, 1),
  ('manual/2010-osaka-university-2010|manual-smash64-1|8', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 80, 'Moyashi', 0, 'Kikoushi', 1, 2),
  ('manual/2010-osaka-university-2010|manual-smash64-1|9', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 90, 'Ruoka Dancho', 1, 'S', 0, 1),
  ('manual/2010-osaka-university-2010|manual-smash64-1|10', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 100, 'Ryo', 0, 'Kikoushi', 1, 2),
  ('manual/2010-osaka-university-2010|manual-smash64-1|11', 'manual/2010-osaka-university-2010', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 110, 'Ruoka Dancho', 1, 'Kikoushi', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2011-4th-kansai (smash64): 8 sets, from https://liquipedia.net/smash/Kansai/4
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2011-4th-kansai|manual-smash64-1|1', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Ruoka Dancho', 1, 'Ryo', 0, 1),
  ('manual/2011-4th-kansai|manual-smash64-1|2', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Takuro~.', 0, 'Natsu', 1, 2),
  ('manual/2011-4th-kansai|manual-smash64-1|3', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Moyashi', 1, 'Prince', 0, 1),
  ('manual/2011-4th-kansai|manual-smash64-1|4', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'S', 0, 'Kikoushi', 1, 2),
  ('manual/2011-4th-kansai|manual-smash64-1|5', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Ruoka Dancho', 1, 'Natsu', 0, 1),
  ('manual/2011-4th-kansai|manual-smash64-1|6', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Moyashi', 1, 'Kikoushi', 0, 1),
  ('manual/2011-4th-kansai|manual-smash64-1|7', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Ruoka Dancho', 0, 'Moyashi', 2, 2),
  ('manual/2011-4th-kansai|manual-smash64-1|8', 'manual/2011-4th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'Natsu', 1, 'Kikoushi', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2011-6th-kanto (smash64): 8 sets, from https://liquipedia.net/smash/Kanto/6
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2011-6th-kanto|manual-smash64-1|1', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'S', 0, 'Din', 1, 2),
  ('manual/2011-6th-kanto|manual-smash64-1|2', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Yamaashi', 0, 'Kikoushi', 1, 2),
  ('manual/2011-6th-kanto|manual-smash64-1|3', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Takuro~.', 1, 'Matsukasa', 0, 1),
  ('manual/2011-6th-kanto|manual-smash64-1|4', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'sekirei', 0, 'Prince', 1, 2),
  ('manual/2011-6th-kanto|manual-smash64-1|5', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Din', 0, 'Kikoushi', 1, 2),
  ('manual/2011-6th-kanto|manual-smash64-1|6', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Takuro~.', 1, 'Prince', 0, 1),
  ('manual/2011-6th-kanto|manual-smash64-1|7', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Kikoushi', 2, 'Takuro~.', 1, 1),
  ('manual/2011-6th-kanto|manual-smash64-1|8', 'manual/2011-6th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'Din', 1, 'Prince', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2012-5th-kansai (smash64): 8 sets, from https://liquipedia.net/smash/Kansai/5
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2012-5th-kansai|manual-smash64-1|1', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'wario', 1, 'Takuro~.', 0, 1),
  ('manual/2012-5th-kansai|manual-smash64-1|2', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Sukekiyo', 1, 'Okajyu', 0, 1),
  ('manual/2012-5th-kansai|manual-smash64-1|3', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Ryo', 1, 'Moyashi', 0, 1),
  ('manual/2012-5th-kansai|manual-smash64-1|4', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'Fukurou', 1, 'Prince', 0, 1),
  ('manual/2012-5th-kansai|manual-smash64-1|5', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'wario', 1, 'Sukekiyo', 0, 1),
  ('manual/2012-5th-kansai|manual-smash64-1|6', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Ryo', 1, 'Fukurou', 0, 1),
  ('manual/2012-5th-kansai|manual-smash64-1|7', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'wario', 2, 'Ryo', 1, 1),
  ('manual/2012-5th-kansai|manual-smash64-1|8', 'manual/2012-5th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'Sukekiyo', 0, 'Fukurou', 1, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2012-7th-kanto (smash64): 7 sets, from https://liquipedia.net/smash/Kanto/7
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2012-7th-kanto|manual-smash64-1|1', 'manual/2012-7th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Kikoushi', 1, 'Ruoka Dancho', 0, 1),
  ('manual/2012-7th-kanto|manual-smash64-1|2', 'manual/2012-7th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'S', 1, 'Fukuoka-ken', 0, 1),
  ('manual/2012-7th-kanto|manual-smash64-1|3', 'manual/2012-7th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Jouske', 1, 'Orion', 0, 1),
  ('manual/2012-7th-kanto|manual-smash64-1|4', 'manual/2012-7th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'Hitoshio', 1, 'TKG', 0, 1),
  ('manual/2012-7th-kanto|manual-smash64-1|5', 'manual/2012-7th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Kikoushi', 1, 'S', 0, 1),
  ('manual/2012-7th-kanto|manual-smash64-1|6', 'manual/2012-7th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Jouske', 1, 'Hitoshio', 0, 1),
  ('manual/2012-7th-kanto|manual-smash64-1|7', 'manual/2012-7th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Kikoushi', 0, 'Jouske', 2, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2013-6th-kansai (smash64): 8 sets, from https://liquipedia.net/smash/Kansai/6
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2013-6th-kansai|manual-smash64-1|1', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Jouske', 1, 'S', 0, 1),
  ('manual/2013-6th-kansai|manual-smash64-1|2', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'kensinn21', 1, 'Kikoushi', 0, 1),
  ('manual/2013-6th-kansai|manual-smash64-1|3', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Moyashi', 1, 'Akagi', 0, 1),
  ('manual/2013-6th-kansai|manual-smash64-1|4', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'bonobono', 1, 'Onett', 0, 1),
  ('manual/2013-6th-kansai|manual-smash64-1|5', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Jouske', 1, 'kensinn21', 0, 1),
  ('manual/2013-6th-kansai|manual-smash64-1|6', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Moyashi', 1, 'bonobono', 0, 1),
  ('manual/2013-6th-kansai|manual-smash64-1|7', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Jouske', 2, 'Moyashi', 1, 1),
  ('manual/2013-6th-kansai|manual-smash64-1|8', 'manual/2013-6th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'kensinn21', 0, 'bonobono', 1, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2013-8th-kanto (smash64): 7 sets, from https://liquipedia.net/smash/Kanto/8
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2013-8th-kanto|manual-smash64-1|1', 'manual/2013-8th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Hitoshio', 0, 'Hebiichigo', 1, 2),
  ('manual/2013-8th-kanto|manual-smash64-1|2', 'manual/2013-8th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Sin', 1, 'kysk', 0, 1),
  ('manual/2013-8th-kanto|manual-smash64-1|3', 'manual/2013-8th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Jouske', 1, 'Ruoka Dancho', 0, 1),
  ('manual/2013-8th-kanto|manual-smash64-1|4', 'manual/2013-8th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'Moyashi', 1, 'wario', 0, 1),
  ('manual/2013-8th-kanto|manual-smash64-1|5', 'manual/2013-8th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Hebiichigo', 0, 'Sin', 1, 2),
  ('manual/2013-8th-kanto|manual-smash64-1|6', 'manual/2013-8th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Jouske', 1, 'Moyashi', 0, 1),
  ('manual/2013-8th-kanto|manual-smash64-1|7', 'manual/2013-8th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'Sin', 1, 'Jouske', 2, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2014-7th-kansai (smash64): 8 sets, from https://liquipedia.net/smash/Kansai/7
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2014-7th-kansai|manual-smash64-1|1', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Haha', 0, 'wario', 1, 2),
  ('manual/2014-7th-kansai|manual-smash64-1|2', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Jouske', 1, 'kensinn21', 0, 1),
  ('manual/2014-7th-kansai|manual-smash64-1|3', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Myuto', 0, 'Ruoka Dancho', 1, 2),
  ('manual/2014-7th-kansai|manual-smash64-1|4', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'Takeshi', 1, 'Shuumai', 0, 1),
  ('manual/2014-7th-kansai|manual-smash64-1|5', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'wario', 1, 'Jouske', 0, 1),
  ('manual/2014-7th-kansai|manual-smash64-1|6', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Ruoka Dancho', 1, 'Takeshi', 0, 1),
  ('manual/2014-7th-kansai|manual-smash64-1|7', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'wario', 2, 'Ruoka Dancho', 1, 1),
  ('manual/2014-7th-kansai|manual-smash64-1|8', 'manual/2014-7th-kansai', 'manual-smash64-1', 'smash64', 'Bracket', '3rd Place Match', 80, 'Jouske', 1, 'Takeshi', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2014-9th-kanto (smash64): 7 sets, from https://liquipedia.net/smash/Kanto/9
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2014-9th-kanto|manual-smash64-1|1', 'manual/2014-9th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 10, 'Tomo', 1, 'k y s k', 0, 1),
  ('manual/2014-9th-kanto|manual-smash64-1|2', 'manual/2014-9th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 20, 'Sin', 0, 'kensinn21', 1, 2),
  ('manual/2014-9th-kanto|manual-smash64-1|3', 'manual/2014-9th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 30, 'Jouske', 1, 'Akipika', 0, 1),
  ('manual/2014-9th-kanto|manual-smash64-1|4', 'manual/2014-9th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Quarterfinals', 40, 'MEGU', 1, 'Takuro~.', 0, 1),
  ('manual/2014-9th-kanto|manual-smash64-1|5', 'manual/2014-9th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 50, 'Tomo', 0, 'kensinn21', 1, 2),
  ('manual/2014-9th-kanto|manual-smash64-1|6', 'manual/2014-9th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Semifinals', 60, 'Jouske', 1, 'MEGU', 0, 1),
  ('manual/2014-9th-kanto|manual-smash64-1|7', 'manual/2014-9th-kanto', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 70, 'kensinn21', 0, 'Jouske', 2, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2014-tacna-2014 (smash64): 2 sets, from https://liquipedia.net/smash/Tacna/2014
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2014-tacna-2014|manual-smash64-1|1', 'manual/2014-tacna-2014', 'manual-smash64-1', 'smash64', 'Bracket', 'Losers Finals', 10, 'Marka', 2, 'SuPeRbOoMfAn', 0, 1),
  ('manual/2014-tacna-2014|manual-smash64-1|2', 'manual/2014-tacna-2014', 'manual-smash64-1', 'smash64', 'Bracket', 'Grand Finals', 20, 'Alvin', 4, 'Marka', 1, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;
