// Smash history: each year's official community ranking, its top 10, shown on the year page with credit and a
// link (Matthew, 2026-11-19: "whenever there's an official ranking, people also find it very relevant").
// The rankings are the community's own (SSBMRank, MPGR, PGRU, UltRank / LumiRank, PMRank, SSBBRank, the 64
// rankings), not Smashy's. Read by hand from each edition's SmashWiki article on 2026-11-19: year-end
// editions only (mid-year lists and multi-year ones are left out; Melee had none for 2020-2021, Ultimate
// none for 2020-2021). LumiRank 2024 was split in two halves; its second half stands for 2024.
// Added the same way on 2026-11-19: Smash 4's PGR v2, v4 and v5 (v1 spans 2015-2016 and v3 is mid-year; v5,
// the first half of 2018, was the last before Ultimate) and Brawl's 2023 and 2024 SSBBRank (the 2016-2022
// editions span several years).
import type { GameKey } from "./games";

/**
 * One edition of a ranking. `year` (and `alsoYears`, for one spanning several) is where it's shown; `kind`
 * is left out for the year-end edition, "mid" for a mid-year or part-year one, "multi" for one spanning years,
 * "retro" for one made years later, looking back (RetroSSBMRank), "tiers" for a Contenders list that groups
 * players in tiers (by region) instead of numbering them.
 */
export type RankingTiers = { region: string | null; tiers: [tier: string, names: string[]][] };
export type OfficialRanking = {
  game: GameKey;
  year: number;
  alsoYears?: number[];
  kind?: "mid" | "multi" | "tiers" | "retro";
  name: string;
  page: string;
  top: [rank: number, name: string][];
  tiers?: RankingTiers[];
};

export const SMASHWIKI = "https://www.ssbwiki.com/";

export const OFFICIAL_RANKINGS: OfficialRanking[] = [
  { game: "melee", year: 2013, name: "SSBMRank 2013", page: "SSBMRank_2013", top: [[1,"Mango"],[2,"Armada"],[3,"Mew2King"],[4,"Dr. PeePee"],[5,"Hungrybox"],[6,"Hax"],[7,"Shroomed"],[8,"Wobbles"],[9,"KirbyKaze"],[10,"SFAT"]] },
  { game: "melee", year: 2014, name: "SSBMRank 2014", page: "SSBMRank_2014", top: [[1,"Mango"],[2,"Armada"],[3,"PPMD"],[4,"Mew2King"],[5,"Hungrybox"],[6,"Leffen"],[7,"Axe"],[8,"Hax"],[9,"Westballz"],[10,"Colbol"]] },
  { game: "melee", year: 2015, name: "SSBMRank 2015", page: "SSBMRank_2015", top: [[1,"Armada"],[2,"Hungrybox"],[3,"Leffen"],[4,"Mango"],[5,"Mew2King"],[6,"PPMD"],[7,"Plup"],[8,"Westballz"],[9,"Axe"],[10,"Shroomed"]] },
  { game: "melee", year: 2016, name: "SSBMRank 2016", page: "SSBMRank_2016", top: [[1,"Armada"],[2,"Hungrybox"],[3,"Mango"],[4,"Mew2King"],[5,"Leffen"],[6,"Plup"],[7,"SFAT"],[8,"Westballz"],[9,"Axe"],[10,"Shroomed"]] },
  { game: "melee", year: 2017, name: "SSBMRank 2017", page: "SSBMRank_2017", top: [[1,"Hungrybox"],[2,"Armada"],[3,"Mango"],[4,"Mew2King"],[5,"Plup"],[6,"Leffen"],[7,"Axe"],[8,"Wizzrobe"],[9,"SFAT"],[10,"S2J"]] },
  { game: "melee", year: 2018, name: "MPGR 2018", page: "MPGR_2018", top: [[1,"Hungrybox"],[2,"Armada"],[3,"Leffen"],[4,"Plup"],[5,"Mango"],[6,"Mew2King"],[7,"Zain"],[8,"Wizzrobe"],[9,"aMSa"],[10,"Axe"]] },
  { game: "melee", year: 2019, name: "MPGR 2019", page: "MPGR_2019", top: [[1,"Hungrybox"],[2,"Leffen"],[3,"Mango"],[4,"Axe"],[5,"Wizzrobe"],[6,"Zain"],[7,"aMSa"],[8,"Plup"],[9,"iBDW"],[10,"Mew2King"]] },
  { game: "melee", year: 2022, name: "SSBMRank 2022", page: "SSBMRank_2022", top: [[1,"Zain"],[2,"aMSa"],[3,"Mang0"],[4,"Cody Schwab"],[5,"Hungrybox"],[6,"Jmook"],[7,"Leffen"],[8,"Plup"],[9,"SluG"],[10,"Axe"]] },
  { game: "melee", year: 2023, name: "SSBMRank 2023", page: "SSBMRank_2023", top: [[1,"Cody Schwab"],[2,"Zain"],[3,"Jmook"],[4,"moky"],[5,"Plup"],[6,"aMSa"],[7,"Hungrybox"],[8,"Mang0"],[9,"Wizzrobe"],[10,"Aklo"]] },
  { game: "melee", year: 2024, name: "SSBMRank 2024", page: "SSBMRank_2024", top: [[1,"Zain"],[2,"Cody Schwab"],[3,"Mang0"],[4,"moky"],[5,"Jmook"],[6,"aMSa"],[7,"Hungrybox"],[8,"Aklo"],[9,"Joshman"],[10,"Nicki"]] },
  { game: "melee", year: 2025, name: "SSBMRank 2025", page: "SSBMRank_2025", top: [[1,"Zain"],[2,"Cody Schwab"],[3,"Hungrybox"],[4,"Joshman"],[5,"moky"],[6,"Axe"],[7,"Jmook"],[8,"SDJ"],[9,"Wizzrobe"],[10,"lloD"]] },
  { game: "ultimate", year: 2019, name: "PGRU (fall 2019)", page: "Fall_2019_PGRU", top: [[1,"MkLeo"],[2,"Samsora"],[3,"Tweek"],[4,"Nairo"],[5,"Marss"],[6,"Maister"],[7,"Zackray"],[8,"Glutonny"],[9,"Dabuz"],[10,"Light"]] },
  { game: "ultimate", year: 2022, name: "UltRank 2022", page: "UltRank_2022", top: [[1,"MkLeo"],[2,"acola"],[3,"Sparg0"],[4,"Light"],[5,"Tea"],[6,"Onin"],[7,"Shuton"],[8,"Tweek"],[9,"Riddles"],[10,"ProtoBanham"]] },
  { game: "ultimate", year: 2023, name: "LumiRank 2023", page: "LumiRank_2023", top: [[1,"acola"],[2,"Sparg0"],[3,"Sonix"],[4,"Miya"],[5,"Glutonny"],[6,"Light"],[7,"Tweek"],[8,"Yoshidora"],[9,"Riddles"],[10,"Shuton"]] },
  { game: "ultimate", year: 2024, name: "LumiRank 2024.2 (second half of 2024)", page: "LumiRank_2024.2", top: [[1,"Sparg0"],[2,"Miya"],[3,"acola"],[4,"Light"],[5,"Sonix"],[6,"Raru"],[7,"Shuton"],[8,"MkLeo"],[9,"Asimo"],[10,"Tweek"]] },
  { game: "ultimate", year: 2025, name: "UltRank 2025", page: "UltRank_2025", top: [[1,"Doramigi"],[2,"Miya"],[3,"acola"],[4,"Hurt"],[5,"Sparg0"],[6,"Sonix"],[7,"Syrup"],[8,"Zomba"],[9,"Carmelo"],[10,"Raru"]] },
  { game: "pplus", year: 2016, name: "PMRank 2016", page: "PMRank_2016", top: [[1,"ThundeRzReiGN"],[2,"Lunchables"],[3,"Sosa"],[4,"Malachi"],[5,"Junebug"],[6,"MrLz"],[7,"Gallo"],[8,"HyperFlame"],[9,"Jose V"],[10,"Flipp"]] },
  { game: "pplus", year: 2017, name: "PMRank 2017", page: "PMRank_2017", top: [[1,"ThundeRzReiGN"],[2,"Malachi"],[3,"Sosa"],[4,"Switch"],[5,"Flipp"],[6,"Fuzz"],[7,"HyperFlame"],[8,"techboy"],[9,"dvd"],[10,"Sothe"]] },
  { game: "pplus", year: 2018, name: "PMRank 2018", page: "PMRank_2018", top: [[1,"Sosa"],[2,"Switch"],[3,"Lunchables"],[4,"ThundeRzReiGN"],[5,"Malachi"],[6,"techboy"],[7,"Fuzz"],[8,"Blank"],[9,"Flipp"],[10,"dvd"]] },
  { game: "pplus", year: 2019, name: "PMRank 2019", page: "PMRank_2019", top: [[1,"Malachi"],[2,"ThundeRzReiGN"],[3,"techboy"],[4,"BaconPancakes"],[5,"The Doctor"],[6,"Morsecode762"],[7,"Switch"],[8,"Pikmon"],[9,"Rongunshu"],[10,"Sothe"]] },
  { game: "pplus", year: 2022, name: "PMRank 2022", page: "PMRank_2022", top: [[1,"The Doctor"],[2,"techboy"],[3,"Jonny Sosa"],[4,"Stango"],[5,"Nogh"],[6,"Rongunshu"],[7,"dvd"],[8,"Malachi"],[9,"SipMastah"],[10,"Kycse"]] },
  { game: "pplus", year: 2023, name: "PMRank 2023", page: "PMRank_2023", top: [[1,"dvd"],[2,"techboy"],[3,"Lunchables"],[4,"Rongunshu"],[5,"The Doctor"],[6,"Malachi"],[7,"Phresh"],[8,"SipMastah"],[9,"Blue"],[10,"Stango"]] },
  { game: "pplus", year: 2024, name: "PMRank 2024", page: "PMRank_2024", top: [[1,"SipMastah"],[2,"Shiny Zubat"],[3,"Dirtboy"],[4,"Flarp"],[5,"Sneez"],[6,"Morsecode762"],[7,"Ellipsis"],[8,"Pikmon"],[9,"Switch"],[10,"Anther"]] },
  { game: "pplus", year: 2025, name: "PMRank 2025", page: "PMRank_2025", top: [[1,"SipMastah"],[2,"Ryzuul"],[3,"RapMonster"],[4,"Morsecode762"],[5,"Blitz"],[6,"Salt"],[7,"Dirtboy"],[8,"Jagz$"],[9,"Not Chris"],[10,"Shiny Zubat"]] },
  { game: "smash64", year: 2016, name: "2016 64 League Rankings", page: "2016_64_League_Rankings", top: [[1,"wario"],[2,"SuPeRbOoMfAn"],[3,"Isai"],[4,"Alvin"],[5,"wangera"],[6,"Mariguas"],[7,"Wizzrobe"],[8,"tacos"],[9,"Dext3r"],[10,"KeroKeroppi"]] },
  { game: "smash64", year: 2017, name: "2017 64 League Rankings", page: "2017_64_League_Rankings", top: [[1,"Fukurou"],[2,"Alvin"],[3,"Kurabba"],[4,"SuPeRbOoMfAn"],[5,"Wizzrobe"],[6,"wangera"],[7,"kysk"],[8,"Mariguas"],[9,"Dext3r"],[10,"wario"]] },
  { game: "smash64", year: 2018, name: "2018 64 League Rankings", page: "2018_64_League_Rankings", top: [[1,"SuPeRbOoMfAn"],[2,"Alvin"],[3,"Isai"],[4,"Wizzrobe"],[5,"KeroKeroppi"],[6,"tacos"],[7,"Zero"],[8,"Fox"],[9,"Prince"],[10,"Revan"]] },
  { game: "smash64", year: 2023, name: "2023 Smash 64 Power Rankings", page: "2023_Smash_64_Power_Rankings", top: [[1,"Isai"],[2,"Kurabba"],[3,"SuPeRbOoMfAn"],[4,"Nax"],[5,"KeroKeroppi"],[6,"kysk"],[7,"Wizzrobe"],[8,"Alvin"],[9,"Zero"],[10,"JaimeHR"]] },
  { game: "smash64", year: 2024, name: "2024 Smash 64 Power Rankings", page: "2024_Smash_64_Power_Rankings", top: [[1,"Kurabba"],[2,"SuPeRbOoMfAn"],[3,"wario"],[4,"KeroKeroppi"],[5,"Robert"],[6,"Nax"],[7,"HAMMERHEART"],[8,"Lowww"],[9,"Wizzrobe"],[10,"KD3"]] },
  { game: "smash64", year: 2025, name: "2025 Smash 64 Power Rankings", page: "2025_Smash_64_Power_Rankings", top: [[1,"Kurabba"],[2,"wario"],[3,"Isai"],[4,"SuPeRbOoMfAn"],[5,"KeroKeroppi"],[6,"Robert"],[7,"KD3"],[8,"Josh Brody"],[9,"Dogs Johnson"],[10,"Lowww"]] },
  { game: "brawl", year: 2014, name: "SSBBRank 2014", page: "SSBBRank_2014", top: [[1,"Nairo"],[1,"9B"],[3,"ZeRo"],[4,"Otori"],[5,"Mew2King"],[6,"ESAM"],[7,"ADHD"],[8,"Ally"],[9,"Vinnie"],[10,"Mikeneko"]] },
  { game: "brawl", year: 2023, name: "2023 SSBBRank", page: "2023_SSBBRank", top: [[1,"686M"],[2,"Cody"],[3,"Player-1"],[4,"Hoenn"],[5,"Gunnermaniac"],[6,"Bike"],[7,"Mikeray4"],[8,"Chia"],[9,"Lux"],[10,"Kyoz"]] },
  { game: "brawl", year: 2024, name: "2024 SSBBRank", page: "2024_SSBBRank", top: [[1,"Cody"],[2,"686M"],[3,"Player-1"],[4,"Lux"],[5,"Hoenn"],[6,"Kyoz"],[7,"Mikeray4"],[8,"Fino"],[9,"Chia"],[10,"Max Power"]] },
  { game: "smash4", year: 2016, name: "PGR v2 (May–December 2016)", page: "PGR_v2", top: [[1,"ZeRo"],[2,"Ally"],[3,"Nairo"],[4,"Dabuz"],[5,"Larry Lurr"],[6,"VoiD"],[7,"Abadango"],[8,"MkLeo"],[9,"ANTi"],[10,"Mr.R"]] },
  { game: "smash4", year: 2017, name: "PGR v4 (June–December 2017)", page: "PGR_v4", top: [[1,"ZeRo"],[2,"Salem"],[3,"Nairo"],[4,"MkLeo"],[5,"Tweek"],[6,"Dabuz"],[7,"Larry Lurr"],[8,"KEN"],[9,"VoiD"],[10,"Mr.R"]] },
  { game: "smash4", year: 2018, name: "PGR v5 (first half of 2018, the last Smash 4 ranking)", page: "PGR_v5", top: [[1,"MkLeo"],[2,"Tweek"],[3,"Dabuz"],[4,"Nairo"],[5,"Salem"],[6,"Mistake"],[7,"Cosmos"],[8,"Mr.R"],[9,"CaptainZack"],[10,"komorikiri"]] },
  { game: "brawl", year: 2025, name: "SSBBRank 2025", page: "SSBBRank_2025", top: [[1,"Player-1"],[2,"Vex Kasrani"],[3,"Lux"],[4,"Kyoz"],[5,"Mikeray4"],[6,"Cody"],[7,"Hoenn"],[8,"Hinkage"],[9,"Chia"],[10,"Fino"]] },
  // RetroSSBMRank (round 766): a top 10 for each Melee year before SSBMRank, made years later by Smash History
  // creators Edwin Budding and Pikachu942, read by hand from its SmashWiki article on 2026-11-22. Shown on the
  // old years with a note that it looks back; left out of the official rankings' tallies.
  { game: "melee", year: 2012, kind: "retro", name: "RetroSSBMRank 2012", page: "RetroSSBMRank#2012", top: [[1,"Armada"],[2,"Dr. Peepee"],[3,"Mango"],[4,"Hungrybox"],[5,"Mew2King"],[6,"KirbyKaze"],[7,"ChuDat"],[8,"Wobbles"],[9,"Zhu"],[10,"Shroomed"]] },
  { game: "melee", year: 2011, kind: "retro", name: "RetroSSBMRank 2011", page: "RetroSSBMRank#2011", top: [[1,"Armada"],[2,"Mango"],[3,"Dr. Peepee"],[4,"Hungrybox"],[5,"Mew2King"],[6,"Fly Amanita"],[7,"Lovage"],[8,"Shroomed"],[9,"Zhu"],[10,"S2J"]] },
  { game: "melee", year: 2010, kind: "retro", name: "RetroSSBMRank 2010", page: "RetroSSBMRank#2010", top: [[1,"Hungrybox"],[2,"Mango"],[3,"Armada"],[4,"Mew2King"],[5,"Dr. Peepee"],[6,"Jman"],[7,"Amsah"],[8,"KirbyKaze"],[9,"Lucky"],[10,"Fly Amanita"]] },
  { game: "melee", year: 2009, kind: "retro", name: "RetroSSBMRank 2009", page: "RetroSSBMRank#2009", top: [[1,"Mango"],[2,"Armada"],[3,"Hungrybox"],[4,"Mew2King"],[5,"DaShizWiz"],[6,"Jman"],[7,"Zhu"],[8,"Darkrain"],[9,"PC Chris"],[10,"Dr. Peepee"]] },
  { game: "melee", year: 2008, kind: "retro", name: "RetroSSBMRank 2008", page: "RetroSSBMRank#2008", top: [[1,"Mew2King"],[2,"Mango"],[3,"Azen"],[4,"Cort"],[5,"PC Chris"],[6,"ChuDat"],[7,"KoreanDJ"],[8,"HugS"],[9,"Ka-Master"],[10,"Jman"]] },
  { game: "melee", year: 2007, kind: "retro", name: "RetroSSBMRank 2007", page: "RetroSSBMRank#2007", top: [[1,"Mew2King"],[2,"KoreanDJ"],[3,"Ken"],[4,"PC Chris"],[5,"Azen"],[6,"ChuDat"],[7,"Chillin"],[8,"Drephen"],[9,"Mango"],[10,"Cort"]] },
  { game: "melee", year: 2006, kind: "retro", name: "RetroSSBMRank 2006", page: "RetroSSBMRank#2006", top: [[1,"Ken"],[2,"Azen"],[3,"PC Chris"],[4,"ChuDat"],[5,"KoreanDJ"],[6,"Mew2King"],[7,"Isai"],[8,"Chillin"],[9,"Vidjogamer"],[10,"HugS"]] },
  { game: "melee", year: 2005, kind: "retro", name: "RetroSSBMRank 2005", page: "RetroSSBMRank#2005", top: [[1,"Ken"],[2,"ChuDat"],[3,"Isai"],[4,"Azen"],[5,"Sastopher"],[6,"NEO"],[7,"Chillin"],[8,"Kei"],[9,"KrazyJones"],[10,"DieSuperFly"]] },
  { game: "melee", year: 2004, kind: "retro", name: "RetroSSBMRank 2004", page: "RetroSSBMRank#2004", top: [[1,"Ken"],[2,"Azen"],[2,"Captain Jack"],[4,"Isai"],[5,"ChuDat"],[6,"Sastopher"],[7,"Wes"],[8,"Rori"],[9,"Chillin"],[10,"DA Dave"]] },
  { game: "melee", year: 2001, alsoYears: [2002, 2003], kind: "retro", name: "RetroSSBMRank 2001-2003", page: "RetroSSBMRank#2001-2003", top: [[1,"Ken"],[2,"Recipherus"],[3,"Isai"],[4,"Azen"],[5,"Sultan of Samitude"],[6,"Justin Junio"],[7,"Zulu"],[8,"Wes"],[9,"Eddie"],[10,"The Doug"]] },
  // Every other edition (Matthew, 2026-11-19: "include all rankings"): mid-year, half-year and multi-year
  // lists, and the tiered Contenders lists, read from SmashWiki the same way.
  { game: "melee", year: 2014, kind: "mid", name: "SSBMRank Summer 2014", page: "SSBMRank_Summer_2014", top: [[1,"PPMD"],[2,"Mango"],[3,"Mew2King"],[4,"Armada"],[5,"Hungrybox"],[6,"Leffen"],[7,"Hax"],[8,"Westballz"],[9,"Fly Amanita"],[10,"Shroomed"]] },
  { game: "melee", year: 2015, kind: "mid", name: "SSBMRank Summer 2015", page: "SSBMRank_Summer_2015", top: [[1,"Armada"],[2,"Leffen"],[3,"Mango"],[4,"PPMD"],[5,"Hungrybox"],[6,"Mew2King"],[7,"Plup"],[8,"Axe"],[9,"Westballz"],[10,"PewPewU"]] },
  { game: "melee", year: 2017, kind: "mid", name: "SSBMRank Summer 2017 (Dec 2016–June 2017)", page: "SSBMRank_Summer_2017", top: [[1,"Armada"],[2,"Hungrybox"],[3,"Mango"],[4,"Mew2King"],[5,"Leffen"],[6,"Plup"],[7,"ChuDat"],[8,"SFAT"],[9,"Axe"],[10,"Wizzrobe"]] },
  { game: "melee", year: 2018, kind: "mid", name: "Summer 2018 MPGR (Dec 2017–July 2018)", page: "Summer_2018_MPGR", top: [[1,"Hungrybox"],[2,"Plup"],[3,"Armada"],[4,"Leffen"],[5,"Mew2King"],[6,"Mango"],[7,"Wizzrobe"],[8,"aMSa"],[9,"Zain"],[10,"Axe"]] },
  { game: "melee", year: 2019, kind: "mid", name: "Summer 2019 MPGR (Dec 2018–June 2019)", page: "Summer_2019_MPGR", top: [[1,"Hungrybox"],[2,"Wizzrobe"],[3,"Axe"],[4,"Leffen"],[5,"Mango"],[6,"Zain"],[7,"Plup"],[8,"aMSa"],[9,"S2J"],[10,"iBDW"]] },
  { game: "smash4", year: 2015, alsoYears: [2016], kind: "multi", name: "PGR v1 (January 2015–May 2016)", page: "PGR_v1", top: [[1,"ZeRo"],[2,"Nairo"],[3,"Dabuz"],[4,"Mr.R"],[5,"Abadango"],[6,"Ally"],[7,"Larry Lurr"],[8,"VoiD"],[9,"Ranai"],[10,"ANTi"]] },
  { game: "smash4", year: 2017, kind: "mid", name: "PGR v3 (January–June 2017)", page: "PGR_v3", top: [[1,"ZeRo"],[2,"MkLeo"],[3,"Nairo"],[4,"Dabuz"],[5,"Ally"],[6,"Larry Lurr"],[7,"CaptainZack"],[8,"komorikiri"],[9,"Mr.R"],[10,"Abadango"]] },
  { game: "melee", year: 2022, kind: "mid", name: "MPGR Summer 2022 (March–July 2022)", page: "MPGR_Summer_2022", top: [[1,"Zain"],[2,"iBDW"],[3,"Jmook"],[4,"Hungrybox"],[5,"Leffen"],[6,"aMSa"],[7,"Plup"],[8,"lloD"],[9,"n0ne"],[10,"KoDoRiN"]] },
  { game: "melee", year: 2023, kind: "mid", name: "SSBMRank Summer 2023 (Dec 2022–July 2023)", page: "SSBMRank_Summer_2023", top: [[1,"Zain"],[2,"Cody Schwab"],[3,"Jmook"],[4,"Leffen"],[5,"moky"],[6,"Mang0"],[7,"aMSa"],[8,"Hungrybox"],[9,"Plup"],[10,"KoDoRiN"]] },
  { game: "melee", year: 2024, kind: "mid", name: "SSBMRank Summer 2024 (Dec 2023–July 2024)", page: "SSBMRank_Summer_2024", top: [[1,"Zain"],[2,"Cody Schwab"],[3,"Mang0"],[4,"aMSa"],[5,"Jmook"],[6,"Hungrybox"],[7,"moky"],[8,"Wizzrobe"],[9,"Soonsay"],[10,"Trif"]] },
  { game: "melee", year: 2025, kind: "mid", name: "SSBMRank Summer 2025 (Dec 2024–July 2025)", page: "SSBMRank_Summer_2025", top: [[1,"Cody Schwab"],[2,"Zain"],[3,"Hungrybox"],[4,"Joshman"],[5,"moky"],[6,"SDJ"],[7,"Axe"],[8,"Salt"],[9,"Wizzrobe"],[10,"Krudo"]] },
  { game: "melee", year: 2026, kind: "mid", name: "SSBMRank Summer 2026 (Dec 2025–July 2026)", page: "SSBMRank_Summer_2026", top: [[1,"Zain"],[2,"Wizzrobe"],[3,"Hungrybox"],[4,"moky"],[5,"Joshman"],[6,"Salt"],[7,"RapMonster"],[8,"Jmook"],[9,"Krudo"],[10,"Aura"]] },
  { game: "brawl", year: 2016, alsoYears: [2017], kind: "multi", name: "SSBBRank 2016–2017 (May 2016–Nov 2017)", page: "SSBBRank_2016-2017", top: [[1,"Nairo"],[2,"ADHD"],[3,"Salem"],[4,"Vinnie"],[5,"V115"],[6,"MVD"],[7,"ANTi"],[8,"Player-1"],[9,"Mikeray4"],[10,"Seagull Joe"]] },
  { game: "brawl", year: 2018, alsoYears: [2019], kind: "multi", name: "SSBBRank 2018–2019 (Feb 2018–Dec 2019)", page: "SSBBRank_2018-2019", top: [[1,"Nairo"],[2,"ANTi"],[3,"Cody"],[4,"ADHD"],[5,"V115"],[6,"Pelca"],[7,"Player-1"],[8,"Mikeray4"],[9,"MVD"],[10,"686M"]] },
  { game: "brawl", year: 2020, alsoYears: [2021, 2022], kind: "multi", name: "SSBBRank 2020–2022 (March 2020–Nov 2022)", page: "SSBBRank_2020-2022", top: [[1,"686M"],[2,"Cody"],[3,"Player-1"],[4,"Hoenn"],[5,"Dabuz"],[6,"Mikeray4"],[7,"Gunnermaniac"],[8,"Zenan"],[9,"Chia"],[10,"Kyoz"]] },
  { game: "smash64", year: 2019, alsoYears: [2020], kind: "multi", name: "2019–2020 Smash 64 Power Rankings (Jan 2019–March 2020)", page: "2019-2020_Smash_64_Power_Rankings", top: [[1,"kysk"],[2,"SuPeRbOoMfAn"],[3,"Wizzrobe"],[4,"KeroKeroppi"],[5,"Alvin"],[6,"tacos"],[7,"Josh Brody"],[8,"Robert"],[9,"fidelcastro22"],[10,"Prince"]] },
  { game: "melee", year: 2021, kind: "tiers", name: "PGRContenders 2021", page: "PGRContenders", top: [], tiers: [{ region: "North America", tiers: [["S+", ["Mango", "iBDW", "Zain"]], ["S", ["aMSa", "Plup", "Wizzrobe"]]] }, { region: "Europe", tiers: [["S+", ["Leffen", "Pipsqueak", "Trif"]], ["S", ["Frenzy", "Ice", "Nicki", "Professor Pro", "Solobattle"]]] }] },
  { game: "ultimate", year: 2021, kind: "tiers", name: "PGRContenders 2021", page: "PGRContenders", top: [], tiers: [{ region: "North America", tiers: [["S+", ["MkLeo", "Sparg0", "Tweek"]], ["S", ["Dabuz", "Kola", "Light", "Maister"]]] }, { region: "Europe", tiers: [["S+", ["Glutonny"]], ["S", ["Bloom4Eva", "Leon", "Mr.R", "Oryon", "sisqui", "Tarik"]]] }] },
  { game: "ultimate", year: 2019, kind: "mid", name: "Spring 2019 PGRU (Feb–July 2019)", page: "Spring_2019_PGRU", top: [[1,"MkLeo"],[2,"Tweek"],[3,"Marss"],[4,"Samsora"],[5,"Shuton"],[6,"Ally"],[7,"Dabuz"],[8,"Nairo"],[9,"VoiD"],[10,"Light"]] },
  { game: "ultimate", year: 2022, kind: "mid", name: "PGRU v3 (March–June 2022)", page: "PGRU_v3", top: [[1,"MkLeo"],[2,"Sparg0"],[3,"Glutonny"],[4,"Light"],[5,"Tweek"],[6,"Riddles"],[7,"Dabuz"],[8,"Kola"],[9,"Zomba"],[10,"Maister"]] },
  { game: "ultimate", year: 2023, kind: "mid", name: "LumiRank Mid-Year 2023 (Dec 2022–July 2023)", page: "LumiRank_Mid-Year_2023", top: [[1,"acola"],[2,"Sparg0"],[3,"Miya"],[4,"Sonix"],[5,"Tweek"],[6,"Light"],[7,"MkLeo"],[8,"Riddles"],[9,"Shuton"],[10,"Yoshidora"]] },
  { game: "ultimate", year: 2024, kind: "mid", name: "LumiRank 2024.1 (Dec 2023–July 2024)", page: "LumiRank_2024.1", top: [[1,"acola"],[2,"Miya"],[3,"Sonix"],[4,"Hurt"],[5,"Tweek"],[6,"Shuton"],[7,"SHADIC"],[8,"TamaPDaifuku"],[9,"Sparg0"],[10,"Light"]] },
  { game: "ultimate", year: 2025, kind: "mid", name: "LumiRank Half Year 2025 (Dec 2024–July 2025)", page: "LumiRank_Half_Year_2025", top: [[1,"Doramigi"],[2,"acola"],[3,"Hurt"],[4,"Miya"],[5,"Sparg0"],[6,"Zomba"],[7,"Tweek"],[8,"Sonix"],[9,"Onin"],[10,"Shuton"]] },
  { game: "ultimate", year: 2025, kind: "mid", name: "UltRank Delta 2025 (July–Dec 2025)", page: "UltRank_Delta_2025", top: [[1,"Miya"],[2,"Doramigi"],[3,"Hurt"],[4,"acola"],[5,"Sparg0"],[6,"Sonix"],[7,"Syrup"],[8,"Zomba"],[9,"Raru"],[10,"Peabnut"]] },
  { game: "ultimate", year: 2026, kind: "mid", name: "UltRank Half Year 2026 (Dec 2025–July 2026)", page: "UltRank_Half_Year_2026", top: [[1,"acola"],[2,"Doramigi"],[3,"Hurt"],[4,"Sonix"],[5,"Zomba"],[6,"Miya"],[7,"Carmelo"],[8,"Sparg0"],[9,"Peabnut"],[10,"Shuton"]] },
  { game: "smash64", year: 2021, alsoYears: [2022], kind: "multi", name: "2021–2022 Smash 64 Power Rankings (June 2021–Nov 2022)", page: "2021-2022_Smash_64_Power_Rankings", top: [[1,"Kurabba"],[2,"Isai"],[3,"Nax"],[4,"Alvin"],[5,"Prince"],[6,"KD3"],[7,"Josh Brody"],[8,"wario"],[9,"JaimeHR"],[10,"Lowww"]] },
  { game: "smash64", year: 2020, kind: "mid", name: "2020 Online Smash 64 Power Rankings (online events)", page: "2020_Online_Smash_64_Power_Rankings", top: [[1,"SuPeRbOoMfAn"],[2,"JaimeHR"],[3,"Qapples"],[4,"SKG"],[5,"rainshifter"],[6,"BarkSanchez"],[7,"Isai"],[8,"Fray"],[9,"HAMMERHEART"],[10,"Finio"]] },
  { game: "pplus", year: 2021, alsoYears: [2022], kind: "tiers", name: "PMRank 2021–22 Mid-Season Contenders List (Sept 2021–April 2022)", page: "PMRank_2021-22_Mid-Season_Contenders_List", top: [], tiers: [{ region: null, tiers: [["S+", ["techboy", "The Doctor"]], ["S", ["dvd", "Jonny Sosa", "Nogh", "Stango"]]] }] },
];

const shownIn = (r: OfficialRanking, year: number) => r.year === year || !!r.alsoYears?.includes(year);
/** Year-end first, then the rest in the order they came out. */
const order = (r: OfficialRanking) => (r.kind ? 1 : 0);

/** A game's rankings shown on a year: its year-end edition first, then the others (mid-year, multi-year, tiers). */
export function officialRankings(year: number, game: GameKey): OfficialRanking[] {
  return OFFICIAL_RANKINGS.filter((r) => r.game === game && shownIn(r, year)).sort((a, b) => order(a) - order(b));
}

/** The year-end ranking for a game's year, if the community made one. */
export function officialRanking(year: number, game: GameKey): OfficialRanking | null {
  return OFFICIAL_RANKINGS.find((r) => r.year === year && r.game === game && !r.kind) ?? null;
}

/** Every numbered ranking shown on a year, all games (the "all games" view: each one's #1). */
export function officialRankingsIn(year: number): OfficialRanking[] {
  return OFFICIAL_RANKINGS.filter((r) => shownIn(r, year) && r.kind !== "tiers").sort((a, b) => order(a) - order(b));
}

/** A ranking of a game's whole era (not a year): shown on that game's all-time records page. */
export type AllTimeRanking = { game: GameKey; name: string; page: string; top: [rank: number, name: string][] };

// Read by hand from SmashWiki on 2026-11-19, like the yearly ones: Panda Global's PGR 100, the top 100 of
// Smash 4's whole era (January 2015 - November 2018).
export const ALL_TIME_RANKINGS: AllTimeRanking[] = [
  { game: "smash4", name: "PGR 100 (2015–2018)", page: "PGR_100", top: [[1,"ZeRo"],[2,"Nairo"],[3,"MkLeo"],[4,"Dabuz"],[5,"Ally"],[6,"Salem"],[7,"Tweek"],[8,"Larry Lurr"],[9,"KEN"],[10,"Mr.R"]] },
];

export const allTimeRanking = (game: GameKey): AllTimeRanking | null => ALL_TIME_RANKINGS.find((r) => r.game === game) ?? null;

/** A player's place in one numbered ranking edition (player pages). */
export type RankingPlace = { ranking: OfficialRanking; rank: number };

/**
 * A game's numbered rankings that list one of these names (compared with `key`, which ignores sponsor tags and
 * capitals), oldest first. Only the game's own rankings: a "Zero" in Smash 64 isn't ZeRo of Smash 4.
 */
export function rankingPlaces(game: GameKey, names: Set<string>, key: (name: string) => string): RankingPlace[] {
  // RetroSSBMRank stays on the year pages: it was made later, so it isn't listed with the rankings of the time.
  return OFFICIAL_RANKINGS.filter((r) => r.game === game && r.kind !== "tiers" && r.kind !== "retro")
    .flatMap((r) => r.top.filter(([, name]) => names.has(key(name))).slice(0, 1).map(([rank]) => ({ ranking: r, rank })))
    .sort((a, b) => a.ranking.year - b.ranking.year || Number(!!a.ranking.kind) - Number(!!b.ranking.kind));
}

/** One player's record across a game's year-end and multi-year rankings (mid-year and tier lists left out). */
export type RankingTally = { key: string; name: string; firsts: number; top10s: number; firstYear: number; lastYear: number };

/** Every ranked player of a game, grouped by `keyOf` (a player id where a tag is known, else the tag). */
export function rankingTallies(game: GameKey, keyOf: (name: string) => string): RankingTally[] {
  const by = new Map<string, RankingTally>();
  for (const r of OFFICIAL_RANKINGS.filter((x) => x.game === game && (!x.kind || x.kind === "multi")).sort((a, b) => a.year - b.year)) {
    const seen = new Set<string>();
    for (const [rank, name] of r.top) {
      const key = keyOf(name);
      if (seen.has(key)) continue;
      seen.add(key);
      const last = r.alsoYears?.at(-1) ?? r.year;
      const t = by.get(key) ?? { key, name, firsts: 0, top10s: 0, firstYear: r.year, lastYear: last };
      by.set(key, { ...t, name, firsts: t.firsts + (rank === 1 ? 1 : 0), top10s: t.top10s + 1, lastYear: last });
    }
  }
  return [...by.values()];
}
