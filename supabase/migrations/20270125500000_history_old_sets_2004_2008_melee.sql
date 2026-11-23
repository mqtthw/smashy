-- Smash history: the rest of the old Melee majors' sets on Liquipedia, read by hand (round 734's way; Matthew,
-- 2026-11-22: "Continue"): bracket pages for MELEE-FC3, Pound 3, Epita Smash Arena 2, the 2005 and 2006 MLG
-- nationals and the 2006 New York playoffs (its level 2, pro bracket), and the top 4 to top 8 that the pages of
-- 2004-2005's majors, EVO World 2007 and MELEE-FC Diamond keep. Scores as Liquipedia lists them; forfeits left
-- out. Made with tools/liquipedia/bracket-to-sql.mjs from tools/liquipedia/brackets/2005-2008-melee.txt. Safe to
-- run twice.

-- manual/2005-melee-fc3 (melee): 60 sets, from https://liquipedia.net/smash/MELEE-FC/3/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2005-melee-fc3|manual-melee-1|1', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 10, 'Husband', 2, 'HugS', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|2', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 20, 'Forward', 0, 'ChuDat', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|3', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 30, 'Iggy', 2, 'Vidjogamer', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|4', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 40, 'Mike G', 1, 'Isai', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|5', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 50, 'SephirothKen', 2, 'Jinx', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|6', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 60, 'Chillindude', 1, 'KrazyJones', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|7', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 70, 'Variety Barrage', 1, 'KM-013', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|8', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 80, 'ManaCloud', 0, 'IK_GOST', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|9', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 90, 'Takagi', 2, 'Drephen', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|10', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 100, 'BloodOfTheFallen', null, 'DieSuperFly', null, 2),
  ('manual/2005-melee-fc3|manual-melee-1|11', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 110, 'Sastopher', 2, 'Tavo', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|12', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 120, 'Oro', 0, 'Dope', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|13', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 130, 'Undisput3d', 2, 'Darkrain', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|14', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 140, 'PC Chris', 2, 'xHayatox', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|15', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 150, 'KishSquared', 0, 'Azen Zagenite', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|16', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 160, 'Wes', 0, 'Caveman', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|17', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 170, 'Husband', 0, 'ChuDat', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|18', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 180, 'Iggy', 0, 'Isai', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|19', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 190, 'SephirothKen', 2, 'KrazyJones', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|20', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 200, 'KM-013', 1, 'IK_GOST', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|21', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 210, 'Takagi', null, 'DieSuperFly', null, 2),
  ('manual/2005-melee-fc3|manual-melee-1|22', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 220, 'Sastopher', 2, 'Dope', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|23', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 230, 'Undisput3d', 2, 'PC Chris', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|24', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 240, 'Azen Zagenite', null, 'Caveman', null, 2),
  ('manual/2005-melee-fc3|manual-melee-1|25', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 250, 'ChuDat', 2, 'Isai', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|26', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 260, 'SephirothKen', 2, 'IK_GOST', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|27', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 270, 'DieSuperFly', 1, 'Sastopher', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|28', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 280, 'Undisput3d', 0, 'Caveman', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|29', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 290, 'ChuDat', 1, 'SephirothKen', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|30', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 300, 'Sastopher', 2, 'Caveman', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|31', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 310, 'HugS', 2, 'Forward', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|32', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 320, 'Vidjogamer', 2, 'Mike G', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|33', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 330, 'Jinx', 0, 'Chillindude', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|34', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 340, 'Variety Barrage', 2, 'ManaCloud', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|35', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 350, 'Drephen', 2, 'BloodOfTheFallen', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|36', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 360, 'Tavo', 1, 'Oro', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|37', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 370, 'Darkrain', 2, 'xHayatox', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|38', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 380, 'KishSquared', 0, 'Wes', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|39', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 390, 'Azen Zagenite', 2, 'HugS', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|40', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 400, 'PC Chris', 2, 'Vidjogamer', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|41', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 410, 'Dope', 2, 'Chillindude', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|42', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 420, 'Takagi', 2, 'Variety Barrage', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|43', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 430, 'KM-013', 2, 'Drephen', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|44', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 440, 'KrazyJones', 2, 'Oro', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|45', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 450, 'Iggy', 0, 'Darkrain', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|46', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 460, 'Husband', 2, 'Wes', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|47', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 470, 'Azen Zagenite', 2, 'PC Chris', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|48', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 480, 'Dope', null, 'Takagi', null, 1),
  ('manual/2005-melee-fc3|manual-melee-1|49', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 490, 'KM-013', 1, 'KrazyJones', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|50', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 500, 'Darkrain', 2, 'Husband', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|51', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 510, 'IK_GOST', 2, 'Azen Zagenite', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|52', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 520, 'Isai', 2, 'Dope', 0, 1),
  ('manual/2005-melee-fc3|manual-melee-1|53', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 530, 'Undisput3d', 1, 'KrazyJones', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|54', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 540, 'DieSuperFly', 2, 'Darkrain', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|55', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 550, 'IK_GOST', 0, 'Isai', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|56', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 560, 'KrazyJones', 2, 'DieSuperFly', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|57', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 570, 'Caveman', 1, 'Isai', 2, 2),
  ('manual/2005-melee-fc3|manual-melee-1|58', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 580, 'ChuDat', 2, 'KrazyJones', 1, 1),
  ('manual/2005-melee-fc3|manual-melee-1|59', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 590, 'Sastopher', 3, 'ChuDat', 2, 1),
  ('manual/2005-melee-fc3|manual-melee-1|60', 'manual/2005-melee-fc3', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 600, 'SephirothKen', 4, 'Sastopher', 1, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2008-pound-3 (melee): 61 sets, from https://liquipedia.net/smash/Pound/3/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2008-pound-3|manual-melee-1|1', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 10, 'Azen', null, 'Eggm', null, 1),
  ('manual/2008-pound-3|manual-melee-1|2', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 20, 'XIF', null, 'Chinesah', null, 2),
  ('manual/2008-pound-3|manual-melee-1|3', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 30, 'Cort', null, 'Plank', null, 1),
  ('manual/2008-pound-3|manual-melee-1|4', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 40, 'Kirbstir', null, 'Eggz', null, 2),
  ('manual/2008-pound-3|manual-melee-1|5', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 50, 'Forward', null, 'Drephen', null, 1),
  ('manual/2008-pound-3|manual-melee-1|6', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 60, 'Chillindude', null, 'Sensei', null, 1),
  ('manual/2008-pound-3|manual-melee-1|7', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 70, 'G-regulate', null, 'PC Chris', null, 2),
  ('manual/2008-pound-3|manual-melee-1|8', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 80, 'HugS', null, 'Dope', null, 1),
  ('manual/2008-pound-3|manual-melee-1|9', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 90, 'Sliq', null, 'LoZR', null, 1),
  ('manual/2008-pound-3|manual-melee-1|10', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 100, 'Mew2King', null, 'Hax', null, 1),
  ('manual/2008-pound-3|manual-melee-1|11', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 110, 'Vidjogamer', null, 'KM', null, 1),
  ('manual/2008-pound-3|manual-melee-1|12', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 120, 'Cactuar', null, 'Colbol', null, 1),
  ('manual/2008-pound-3|manual-melee-1|13', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 130, 'ChuDat', null, 'Mathos', null, 1),
  ('manual/2008-pound-3|manual-melee-1|14', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 140, 'Silent Wolf', 2, 'Mango', 0, 1),
  ('manual/2008-pound-3|manual-melee-1|15', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 150, 'Anther', null, 'Doll', null, 2),
  ('manual/2008-pound-3|manual-melee-1|16', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 160, 'Tope', null, 'Darkrain', null, 2),
  ('manual/2008-pound-3|manual-melee-1|17', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 170, 'Azen', null, 'Chinesah', null, 1),
  ('manual/2008-pound-3|manual-melee-1|18', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 180, 'Cort', null, 'Eggz', null, 1),
  ('manual/2008-pound-3|manual-melee-1|19', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 190, 'Forward', null, 'Chillindude', null, 1),
  ('manual/2008-pound-3|manual-melee-1|20', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 200, 'PC Chris', null, 'HugS', null, 1),
  ('manual/2008-pound-3|manual-melee-1|21', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 210, 'Sliq', null, 'Mew2King', null, 2),
  ('manual/2008-pound-3|manual-melee-1|22', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 220, 'Vidjogamer', null, 'Cactuar', null, 1),
  ('manual/2008-pound-3|manual-melee-1|23', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 230, 'ChuDat', null, 'Silent Wolf', null, 1),
  ('manual/2008-pound-3|manual-melee-1|24', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 240, 'Doll', null, 'Darkrain', null, 2),
  ('manual/2008-pound-3|manual-melee-1|25', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 250, 'Azen', null, 'Cort', null, 2),
  ('manual/2008-pound-3|manual-melee-1|26', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 260, 'Forward', null, 'PC Chris', null, 2),
  ('manual/2008-pound-3|manual-melee-1|27', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 270, 'Mew2King', null, 'Vidjogamer', null, 1),
  ('manual/2008-pound-3|manual-melee-1|28', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 280, 'ChuDat', null, 'Darkrain', null, 1),
  ('manual/2008-pound-3|manual-melee-1|29', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 290, 'Cort', null, 'PC Chris', null, 2),
  ('manual/2008-pound-3|manual-melee-1|30', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 300, 'Mew2King', null, 'ChuDat', null, 1),
  ('manual/2008-pound-3|manual-melee-1|31', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 310, 'Eggm', null, 'XIF', null, 1),
  ('manual/2008-pound-3|manual-melee-1|32', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 320, 'Plank', null, 'Kirbstir', null, 1),
  ('manual/2008-pound-3|manual-melee-1|33', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 330, 'Drephen', null, 'Sensei', null, 1),
  ('manual/2008-pound-3|manual-melee-1|34', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 340, 'G-regulate', null, 'Dope', null, 2),
  ('manual/2008-pound-3|manual-melee-1|35', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 350, 'LoZR', null, 'Hax', null, 2),
  ('manual/2008-pound-3|manual-melee-1|36', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 360, 'KM', null, 'Colbol', null, 2),
  ('manual/2008-pound-3|manual-melee-1|37', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 370, 'Mathos', 0, 'Mango', 2, 2),
  ('manual/2008-pound-3|manual-melee-1|38', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 380, 'Anther', null, 'Tope', null, 2),
  ('manual/2008-pound-3|manual-melee-1|39', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 390, 'Chillindude', null, 'Eggm', null, 2),
  ('manual/2008-pound-3|manual-melee-1|40', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 400, 'HugS', null, 'Plank', null, 1),
  ('manual/2008-pound-3|manual-melee-1|41', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 410, 'Chinesah', null, 'Drephen', null, 2),
  ('manual/2008-pound-3|manual-melee-1|42', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 420, 'Eggz', null, 'Dope', null, 1),
  ('manual/2008-pound-3|manual-melee-1|43', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 430, 'Silent Wolf', 1, 'Hax', 2, 2),
  ('manual/2008-pound-3|manual-melee-1|44', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 440, 'Doll', null, 'Colbol', null, 2),
  ('manual/2008-pound-3|manual-melee-1|45', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 450, 'Sliq', 0, 'Mango', 2, 2),
  ('manual/2008-pound-3|manual-melee-1|46', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 460, 'Cactuar', null, 'Tope', null, 1),
  ('manual/2008-pound-3|manual-melee-1|47', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 470, 'Eggm', null, 'HugS', null, 2),
  ('manual/2008-pound-3|manual-melee-1|48', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 480, 'Drephen', null, 'Eggz', null, 1),
  ('manual/2008-pound-3|manual-melee-1|49', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 490, 'Hax', 2, 'Colbol', 1, 1),
  ('manual/2008-pound-3|manual-melee-1|50', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 500, 'Mango', 2, 'Cactuar', 0, 1),
  ('manual/2008-pound-3|manual-melee-1|51', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 510, 'Vidjogamer', null, 'HugS', null, 1),
  ('manual/2008-pound-3|manual-melee-1|52', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 520, 'Darkrain', null, 'Drephen', null, 1),
  ('manual/2008-pound-3|manual-melee-1|53', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 530, 'Azen', null, 'Hax', null, 1),
  ('manual/2008-pound-3|manual-melee-1|54', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 540, 'Forward', 1, 'Mango', 2, 2),
  ('manual/2008-pound-3|manual-melee-1|55', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 550, 'Vidjogamer', null, 'Darkrain', null, 1),
  ('manual/2008-pound-3|manual-melee-1|56', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 560, 'Azen', 1, 'Mango', 2, 2),
  ('manual/2008-pound-3|manual-melee-1|57', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 570, 'Cort', null, 'Vidjogamer', null, 1),
  ('manual/2008-pound-3|manual-melee-1|58', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 580, 'ChuDat', 1, 'Mango', 2, 2),
  ('manual/2008-pound-3|manual-melee-1|59', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 590, 'PC Chris', 1, 'Mango', 2, 2),
  ('manual/2008-pound-3|manual-melee-1|60', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 600, 'Mew2King', 2, 'Mango', 3, 2),
  ('manual/2008-pound-3|manual-melee-1|61', 'manual/2008-pound-3', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals (reset)', 610, 'Mew2King', 1, 'Mango', 3, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2008-epita-smash-arena-2 (melee): 124 sets, from https://liquipedia.net/smash/Epita_Smash_Arena/2/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2008-epita-smash-arena-2|manual-melee-1|1', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 10, 'Captain Jack', null, 'fatalityCC', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|2', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 20, 'Aniolas', null, 'Ravenlord', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|3', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 30, 'Choco', null, 'Qlex', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|4', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 40, 'Cpt. Zeppo', null, 'Tonberry', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|5', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 50, 'Aldwyn', null, 'C', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|6', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 60, 'Fox128', null, 'AE', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|7', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 70, 'Zgetto', null, 'Urulok', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|8', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 80, 'Calle W', null, 'Aska', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|9', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 90, 'Agony', null, 'Faab', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|10', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 100, 'Marc', null, 'Luma', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|11', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 110, 'Zeta', null, 'cho', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|12', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 120, 'Utto', null, 'perfect_shadow', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|13', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 130, 'Baera', null, 'Armada', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|14', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 140, 'Yuna', null, 'Seretur', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|15', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 150, 'Thieum McCloud', null, 'Benoit', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|16', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 160, 'Ryuker', null, 'Joanna Dark', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|17', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 170, 'Svampen', null, 'FrostByte', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|18', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 180, 'Doraki', null, 'Nazgutaka', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|19', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 190, 'Akke', null, 'Kirby Squad', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|20', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 200, 'Amsah', null, 'Iced', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|21', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 210, 'Ivootjes', null, 'Infernum', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|22', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 220, 'Poilon', null, 'Dev', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|23', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 230, 'Samochan', null, 'ClemJ', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|24', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 240, 'Adam', null, '4ever', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|25', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 250, 'Strawhat Dahean', null, 'Baxon', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|26', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 260, 'LGuy', null, 'Masashi', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|27', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 270, 'Kriz', null, 'Darko', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|28', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 280, 'Chor', null, 'Remen', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|29', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 290, 'Makenshi', null, 'Efen', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|30', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 300, 'Coen', null, 'Fuzzyness', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|31', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 310, 'Overtriforce', null, 'Jadde', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|32', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 320, 'Kurre', null, 'niam', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|33', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 330, 'Captain Jack', null, 'Aniolas', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|34', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 340, 'Choco', null, 'Cpt. Zeppo', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|35', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 350, 'Aldwyn', null, 'Fox128', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|36', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 360, 'Zgetto', null, 'Calle W', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|37', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 370, 'Agony', null, 'Marc', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|38', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 380, 'cho', null, 'Utto', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|39', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 390, 'Armada', null, 'Seretur', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|40', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 400, 'Benoit', null, 'Joanna Dark', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|41', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 410, 'Svampen', null, 'Doraki', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|42', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 420, 'Kirby Squad', null, 'Amsah', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|43', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 430, 'Ivootjes', null, 'Poilon', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|44', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 440, 'ClemJ', null, 'Adam', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|45', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 450, 'Strawhat Dahean', 1, 'Masashi', 3, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|46', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 460, 'Kriz', null, 'Remen', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|47', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 470, 'Makenshi', null, 'Coen', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|48', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 480, 'Overtriforce', null, 'niam', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|49', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 490, 'Captain Jack', null, 'Choco', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|50', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 500, 'Aldwyn', null, 'Calle W', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|51', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 510, 'Marc', null, 'cho', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|52', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 520, 'Armada', null, 'Benoit', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|53', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 530, 'Svampen', null, 'Amsah', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|54', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 540, 'Poilon', null, 'Adam', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|55', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 550, 'Masashi', null, 'Remen', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|56', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 560, 'Makenshi', 3, 'Overtriforce', 2, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|57', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 570, 'Captain Jack', 3, 'Calle W', 0, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|58', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 580, 'Marc', null, 'Armada', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|59', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 590, 'Amsah', null, 'Adam', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|60', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 600, 'Masashi', 3, 'Makenshi', 1, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|61', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 5', 610, 'Captain Jack', 3, 'Armada', 0, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|62', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 5', 620, 'Amsah', 3, 'Masashi', 0, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|63', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 630, 'fatalityCC', null, 'Ravenlord', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|64', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 640, 'Qlex', null, 'Tonberry', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|65', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 650, 'C', null, 'AE', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|66', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 660, 'Urulok', null, 'Aska', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|67', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 670, 'Faab', null, 'Luma', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|68', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 680, 'Zeta', null, 'perfect_shadow', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|69', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 690, 'Baera', null, 'Yuna', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|70', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 700, 'Thieum McCloud', null, 'Ryuker', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|71', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 710, 'FrostByte', null, 'Nazgutaka', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|72', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 720, 'Akke', null, 'Iced', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|73', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 730, 'Infernum', null, 'Dev', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|74', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 740, 'Samochan', null, '4ever', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|75', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 750, 'Baxon', null, 'LGuy', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|76', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 760, 'Darko', null, 'Chor', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|77', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 770, 'Efen', null, 'Fuzzyness', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|78', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 780, 'Jadde', null, 'Kurre', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|79', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 790, 'Agony', null, 'Ravenlord', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|80', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 800, 'Utto', null, 'Tonberry', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|81', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 810, 'Seretur', null, 'C', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|82', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 820, 'Joanna Dark', null, 'Aska', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|83', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 830, 'Aniolas', null, 'Faab', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|84', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 840, 'Cpt. Zeppo', null, 'perfect_shadow', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|85', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 850, 'Fox128', null, 'Yuna', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|86', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 860, 'Zgetto', null, 'Ryuker', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|87', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 870, 'Strawhat Dahean', null, 'FrostByte', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|88', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 880, 'Kriz', null, 'Akke', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|89', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 890, 'Coen', null, 'Infernum', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|90', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 900, 'niam', null, 'Samochan', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|91', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 910, 'Doraki', null, 'Baxon', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|92', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 920, 'Kirby Squad', null, 'Darko', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|93', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 930, 'Ivootjes', null, 'Fuzzyness', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|94', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 940, 'ClemJ', null, 'Jadde', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|95', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 950, 'Agony', null, 'Tonberry', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|96', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 960, 'Seretur', null, 'Aska', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|97', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 970, 'Faab', null, 'Cpt. Zeppo', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|98', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 980, 'Fox128', null, 'Zgetto', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|99', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 990, 'Strawhat Dahean', null, 'Kriz', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|100', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 1000, 'Infernum', null, 'niam', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|101', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 1010, 'Baxon', null, 'Darko', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|102', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 1020, 'Fuzzyness', null, 'ClemJ', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|103', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1030, 'Poilon', null, 'Agony', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|104', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1040, 'Svampen', null, 'Seretur', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|105', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1050, 'Overtriforce', null, 'Faab', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|106', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1060, 'Remen', null, 'Zgetto', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|107', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1070, 'Aldwyn', null, 'Strawhat Dahean', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|108', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1080, 'Choco', null, 'Infernum', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|109', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1090, 'Benoit', null, 'Baxon', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|110', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 1100, 'cho', null, 'ClemJ', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|111', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 1110, 'Poilon', null, 'Seretur', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|112', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 1120, 'Overtriforce', null, 'Zgetto', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|113', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 1130, 'Strawhat Dahean', null, 'Choco', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|114', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 1140, 'Benoit', null, 'ClemJ', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|115', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 1150, 'Marc', null, 'Poilon', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|116', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 1160, 'Calle W', null, 'Zgetto', null, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|117', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 1170, 'Makenshi', 3, 'Strawhat Dahean', 1, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|118', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 6', 1180, 'Adam', 3, 'ClemJ', 0, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|119', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 7', 1190, 'Poilon', null, 'Calle W', null, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|120', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 7', 1200, 'Makenshi', 1, 'Adam', 3, 2),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|121', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 8', 1210, 'Masashi', 3, 'Calle W', 1, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|122', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 8', 1220, 'Armada', 3, 'Adam', 0, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|123', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 1230, 'Captain Jack', 4, 'Armada', 2, 1),
  ('manual/2008-epita-smash-arena-2|manual-melee-1|124', 'manual/2008-epita-smash-arena-2', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 1240, 'Amsah', 4, 'Captain Jack', 3, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2006-2006-mlg-national-championships (melee): 12 sets, from https://liquipedia.net/smash/MLG/2006/Las_Vegas/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|1', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 10, 'Ken', 3, 'HugS', 0, 1),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|2', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 20, 'Mew2King', 0, 'KoreanDJ', 3, 2),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|3', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 30, 'PC Chris', 3, 'Azen', 1, 1),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|4', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 40, 'Isai', 3, 'ChuDat', 0, 1),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|5', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 50, 'Ken', 2, 'KoreanDJ', 3, 2),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|6', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 60, 'PC Chris', 3, 'Isai', 0, 1),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|7', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 70, 'HugS', 0, 'Mew2King', 3, 2),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|8', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 80, 'Azen', 3, 'ChuDat', 1, 1),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|9', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 90, 'Isai', 0, 'Mew2King', 3, 2),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|10', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 100, 'Ken', 3, 'Azen', 1, 1),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|11', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 110, 'KoreanDJ', 3, 'Ken', 0, 1),
  ('manual/2006-2006-mlg-national-championships|manual-melee-1|12', 'manual/2006-2006-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 120, 'PC Chris', 3, 'KoreanDJ', 3, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2006-2005-mlg-national-championships (melee): 32 sets, from https://liquipedia.net/smash/MLG/2005/Championship/Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|1', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 10, 'Wife', 1, 'Vidjogamer', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|2', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 1', 20, 'KrazyJones', 3, 'Tavo7', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|3', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 30, 'Ken', 3, 'Vidjogamer', 1, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|4', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 40, 'Oro', 3, 'Eddie', 2, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|5', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 50, 'Husband', 2, 'Rob$', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|6', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 60, 'Caveman', 1, 'Azen', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|7', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 70, 'Isai', 3, 'Chillindude', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|8', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 80, 'PC Chris', 3, 'KillaOR', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|9', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 90, 'Neo', 3, 'DieSuperFly', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|10', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 2', 100, 'KrazyJones', 1, 'ChuDat', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|11', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 110, 'Ken', 3, 'Oro', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|12', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 120, 'Rob$', 3, 'Azen', 1, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|13', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 130, 'Isai', 2, 'PC Chris', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|14', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 3', 140, 'Neo', 0, 'ChuDat', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|15', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 150, 'Ken', 3, 'Rob$', 1, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|16', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Winners Round 4', 160, 'PC Chris', 2, 'ChuDat', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|17', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 170, 'Wife', 0, 'KrazyJones', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|18', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 180, 'Tavo7', 0, 'Vidjogamer', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|19', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 190, 'KrazyJones', 3, 'DieSuperFly', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|20', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 200, 'KillaOR', 0, 'Chillindude', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|21', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 210, 'Husband', 0, 'Caveman', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|22', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 220, 'Vidjogamer', 3, 'Eddie', 1, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|23', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 230, 'Oro', 1, 'KrazyJones', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|24', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 240, 'Azen', 0, 'Chillindude', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|25', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 250, 'Isai', 3, 'Caveman', 1, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|26', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 260, 'Neo', 3, 'Vidjogamer', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|27', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 270, 'KrazyJones', 1, 'Chillindude', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|28', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 4', 280, 'Isai', 3, 'Neo', 1, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|29', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 290, 'PC Chris', 3, 'Chillindude', 2, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|30', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 5', 300, 'Rob$', 2, 'Isai', 3, 2),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|31', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 310, 'ChuDat', 3, 'PC Chris', 0, 1),
  ('manual/2006-2005-mlg-national-championships|manual-melee-1|32', 'manual/2006-2005-mlg-national-championships', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 320, 'Ken', 3, 'ChuDat', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2006-mlg-new-york-playoffs-2006 (melee): 14 sets, from https://liquipedia.net/smash/MLG/2006/New_York_Playoffs/Level_2_Singles_Bracket
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|1', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 10, 'Ken', 2, 'Azen', 3, 2),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|2', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 20, 'KoreanDJ', 3, 'Mew2King', 0, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|3', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 30, 'PC Chris', 3, 'Isai', 0, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|4', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Quarterfinals', 40, 'HugS', 2, 'ChuDat', 3, 2),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|5', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 50, 'Azen', 3, 'KoreanDJ', 2, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|6', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 60, 'PC Chris', 3, 'ChuDat', 1, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|7', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 70, 'Ken', 2, 'Mew2King', 3, 2),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|8', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 80, 'Isai', 3, 'HugS', 2, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|9', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 90, 'ChuDat', 3, 'Mew2King', 0, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|10', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 100, 'KoreanDJ', 3, 'Isai', 1, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|11', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', '7th Place Match', 110, 'Ken', null, 'HugS', null, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|12', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', '5th Place Match', 120, 'Mew2King', null, 'Isai', null, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|13', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 130, 'PC Chris', 3, 'ChuDat', 2, 1),
  ('manual/2006-mlg-new-york-playoffs-2006|manual-melee-1|14', 'manual/2006-mlg-new-york-playoffs-2006', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 140, 'Azen', 3, 'PC Chris', 0, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2007-evo-world-2007 (melee): 11 sets, from https://liquipedia.net/smash/EVO/2007/World
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2007-evo-world-2007|manual-melee-1|1', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 10, 'HugS', 0, 'Ken', 2, 2),
  ('manual/2007-evo-world-2007|manual-melee-1|2', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals (reset)', 20, 'HugS', 1, 'Ken', 2, 2),
  ('manual/2007-evo-world-2007|manual-melee-1|3', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 30, 'Mango', 2, 'Ken', 1, 1),
  ('manual/2007-evo-world-2007|manual-melee-1|4', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 40, 'PC Chris', 1, 'HugS', 2, 2),
  ('manual/2007-evo-world-2007|manual-melee-1|5', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Winners Finals', 50, 'Mango', 0, 'HugS', 2, 2),
  ('manual/2007-evo-world-2007|manual-melee-1|6', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Losers Top 8', 60, 'Eddie', 2, 'DieSuperFly', 0, 1),
  ('manual/2007-evo-world-2007|manual-melee-1|7', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Losers Top 8', 70, 'ChuDat', 2, 'Chillin', 1, 1),
  ('manual/2007-evo-world-2007|manual-melee-1|8', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Losers Quarterfinals', 80, 'PC Chris', 2, 'Eddie', 0, 1),
  ('manual/2007-evo-world-2007|manual-melee-1|9', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Losers Quarterfinals', 90, 'Ken', 2, 'ChuDat', 1, 1),
  ('manual/2007-evo-world-2007|manual-melee-1|10', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Losers Semifinals', 100, 'PC Chris', 0, 'Ken', 2, 2),
  ('manual/2007-evo-world-2007|manual-melee-1|11', 'manual/2007-evo-world-2007', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 110, 'Mango', 0, 'Ken', 2, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2007-melee-fc-diamond (melee): 11 sets, from https://liquipedia.net/smash/MELEE-FC/Diamond/Melee
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2007-melee-fc-diamond|manual-melee-1|1', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 10, 'PC Chris', 0, 'Mew2King', 3, 2),
  ('manual/2007-melee-fc-diamond|manual-melee-1|2', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals (reset)', 20, 'PC Chris', 0, 'Mew2King', 3, 2),
  ('manual/2007-melee-fc-diamond|manual-melee-1|3', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 30, 'PC Chris', null, 'ChuDat', null, 1),
  ('manual/2007-melee-fc-diamond|manual-melee-1|4', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Semifinals', 40, 'Mew2King', 3, 'Drephen', 1, 1),
  ('manual/2007-melee-fc-diamond|manual-melee-1|5', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Winners Finals', 50, 'PC Chris', 3, 'Mew2King', 0, 1),
  ('manual/2007-melee-fc-diamond|manual-melee-1|6', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 60, 'Vidjogamer', null, 'DaShizWiz', null, 1),
  ('manual/2007-melee-fc-diamond|manual-melee-1|7', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 70, 'Taj', null, 'Darkrain', null, 1),
  ('manual/2007-melee-fc-diamond|manual-melee-1|8', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 80, 'Drephen', null, 'Vidjogamer', null, 1),
  ('manual/2007-melee-fc-diamond|manual-melee-1|9', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 90, 'ChuDat', null, 'Taj', null, 1),
  ('manual/2007-melee-fc-diamond|manual-melee-1|10', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 100, 'Drephen', null, 'ChuDat', null, 2),
  ('manual/2007-melee-fc-diamond|manual-melee-1|11', 'manual/2007-melee-fc-diamond', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 110, 'Mew2King', 3, 'ChuDat', 1, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2005-jack-garden-tournament (melee): 2 sets, from https://liquipedia.net/smash/Jack_Garden_Tournament
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2005-jack-garden-tournament|manual-melee-1|1', 'manual/2005-jack-garden-tournament', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 10, 'Masashi', 1, 'Bombsoldier', 3, 2),
  ('manual/2005-jack-garden-tournament|manual-melee-1|2', 'manual/2005-jack-garden-tournament', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 20, 'Ken', 4, 'Bombsoldier', 2, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2005-mlg-los-angeles-2005 (melee): 2 sets, from https://liquipedia.net/smash/MLG/2005/Los_Angeles
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2005-mlg-los-angeles-2005|manual-melee-1|1', 'manual/2005-mlg-los-angeles-2005', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 10, 'Isai', null, 'KillaOR', null, 1),
  ('manual/2005-mlg-los-angeles-2005|manual-melee-1|2', 'manual/2005-mlg-los-angeles-2005', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 20, 'Ken', null, 'Isai', null, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2005-mlg-washington-d-c-2005 (melee): 2 sets, from https://liquipedia.net/smash/MLG/2005/Washington_D.C.
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2005-mlg-washington-d-c-2005|manual-melee-1|1', 'manual/2005-mlg-washington-d-c-2005', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 10, 'ChuDat', null, 'Ken', null, 2),
  ('manual/2005-mlg-washington-d-c-2005|manual-melee-1|2', 'manual/2005-mlg-washington-d-c-2005', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 20, 'Isai', null, 'Ken', null, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2005-moast-3 (melee): 2 sets, from https://liquipedia.net/smash/MOAST_3
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2005-moast-3|manual-melee-1|1', 'manual/2005-moast-3', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 10, 'Ken', null, 'Caveman', null, 1),
  ('manual/2005-moast-3|manual-melee-1|2', 'manual/2005-moast-3', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 20, 'Isai', 3, 'Ken', 2, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2004-mlg-new-york-2004 (melee): 3 sets, from https://liquipedia.net/smash/MLG/2004/New_York
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2004-mlg-new-york-2004|manual-melee-1|1', 'manual/2004-mlg-new-york-2004', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 10, 'Captain Jack', 0, 'Isai', 3, 2),
  ('manual/2004-mlg-new-york-2004|manual-melee-1|2', 'manual/2004-mlg-new-york-2004', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 20, 'Ken', 2, 'Isai', 3, 2),
  ('manual/2004-mlg-new-york-2004|manual-melee-1|3', 'manual/2004-mlg-new-york-2004', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals (reset)', 30, 'Ken', 3, 'Isai', 2, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2004-mlg-san-francisco-2004 (melee): 3 sets, from https://liquipedia.net/smash/MLG/2004/San_Francisco
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2004-mlg-san-francisco-2004|manual-melee-1|1', 'manual/2004-mlg-san-francisco-2004', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 10, 'Ken', null, 'Captain Jack', null, 2),
  ('manual/2004-mlg-san-francisco-2004|manual-melee-1|2', 'manual/2004-mlg-san-francisco-2004', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 20, 'Isai', 0, 'Captain Jack', 3, 2),
  ('manual/2004-mlg-san-francisco-2004|manual-melee-1|3', 'manual/2004-mlg-san-francisco-2004', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals (reset)', 30, 'Isai', 0, 'Captain Jack', 3, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2004-tournament-go-6 (melee): 3 sets, from https://liquipedia.net/smash/Tournament_Go/6
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2004-tournament-go-6|manual-melee-1|1', 'manual/2004-tournament-go-6', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 10, 'Captain Jack', 3, 'Chu Dat', 1, 1),
  ('manual/2004-tournament-go-6|manual-melee-1|2', 'manual/2004-tournament-go-6', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 20, 'Azen', 2, 'Captain Jack', 4, 2),
  ('manual/2004-tournament-go-6|manual-melee-1|3', 'manual/2004-tournament-go-6', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals (reset)', 30, 'Azen', 4, 'Captain Jack', 1, 1)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;

-- manual/2004-game-over (melee): 11 sets, from https://liquipedia.net/smash/Game_Over
insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)
values
  ('manual/2004-game-over|manual-melee-1|1', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Winners Semifinals', 10, 'Azen', null, 'Chillindude', null, 1),
  ('manual/2004-game-over|manual-melee-1|2', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Winners Semifinals', 20, 'Isai', null, 'Wes', null, 1),
  ('manual/2004-game-over|manual-melee-1|3', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Winners Finals', 30, 'Azen', 3, 'Isai', 1, 1),
  ('manual/2004-game-over|manual-melee-1|4', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 40, 'Jason', null, 'Ken', null, 2),
  ('manual/2004-game-over|manual-melee-1|5', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 1', 50, 'Dave', null, 'Sultan of Samitude', null, 1),
  ('manual/2004-game-over|manual-melee-1|6', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 60, 'Chillindude', 1, 'Ken', 2, 2),
  ('manual/2004-game-over|manual-melee-1|7', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 2', 70, 'Wes', null, 'Dave', null, 2),
  ('manual/2004-game-over|manual-melee-1|8', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Losers Round 3', 80, 'Ken', null, 'Dave', null, 1),
  ('manual/2004-game-over|manual-melee-1|9', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Losers Finals', 90, 'Isai', null, 'Ken', null, 2),
  ('manual/2004-game-over|manual-melee-1|10', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals', 100, 'Azen', 1, 'Ken', 4, 2),
  ('manual/2004-game-over|manual-melee-1|11', 'manual/2004-game-over', 'manual-melee-1', 'melee', 'Bracket', 'Grand Finals (reset)', 110, 'Azen', 2, 'Ken', 4, 2)
on conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,
  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;
