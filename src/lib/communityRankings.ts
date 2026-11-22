// The community's own yearly rankings, linked (never copied) from Smash history (Matthew, 2026-11-17:
// tallies + links). Each links its SmashWiki article, which lists every edition. Checked 2026-11-17:
// SSBMRank (2013–2017, 2022 on) and MPGR (2018–2022) for Melee; PGRU (2019–2021) and UltRank / LumiRank
// (2022 on) for Ultimate; Panda Global Rankings (Smash 4, 2016–2018); SSBBRank (Brawl, 2014 on);
// 64 League Rankings (2016–2018) then SSB64UPR (2019 on) for Smash 64; PMRank (Project M, 2016 on).
import type { GameKey } from "./games";

export type CommunityRanking = { name: string; game: GameKey; from: number; to: number | null; url: string };

export const COMMUNITY_RANKINGS: CommunityRanking[] = [
  { name: "SSBMRank", game: "melee", from: 2013, to: 2017, url: "https://www.ssbwiki.com/SSBMRank" },
  { name: "MPGR", game: "melee", from: 2018, to: 2022, url: "https://www.ssbwiki.com/MPGR" },
  { name: "SSBMRank", game: "melee", from: 2022, to: null, url: "https://www.ssbwiki.com/SSBMRank" },
  { name: "PGRU", game: "ultimate", from: 2019, to: 2021, url: "https://www.ssbwiki.com/Panda_Global_Rankings_Ultimate" },
  { name: "UltRank / LumiRank", game: "ultimate", from: 2022, to: null, url: "https://www.ssbwiki.com/UltRank" },
  { name: "Panda Global Rankings", game: "smash4", from: 2016, to: 2018, url: "https://www.ssbwiki.com/PGR" },
  { name: "SSBBRank", game: "brawl", from: 2014, to: null, url: "https://www.ssbwiki.com/SSBBRank" },
  { name: "64 League Rankings", game: "smash64", from: 2016, to: 2018, url: "https://www.ssbwiki.com/64_League_Rankings" },
  { name: "SSB64UPR", game: "smash64", from: 2019, to: null, url: "https://www.ssbwiki.com/SSB64UPR" },
  { name: "PMRank", game: "pplus", from: 2016, to: null, url: "https://www.ssbwiki.com/PMRank" },
];

/** The community rankings that cover a year (one game, or all), each series once. */
export function rankingsFor(year: number, game: GameKey | null): CommunityRanking[] {
  const seen = new Set<string>();
  return COMMUNITY_RANKINGS.filter((r) => (!game || r.game === game) && r.from <= year && (r.to === null || year <= r.to)).filter((r) => {
    const key = `${r.game}|${r.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
