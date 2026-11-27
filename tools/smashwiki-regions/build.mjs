// Makes src/lib/arcadeRegions.ts (round 952): where the players in the Arcade's "Guess the player" are from,
// read from their SmashWiki pages (Matthew, asked where a region hint should come from: "SmashWiki pages").
// Smash history's saved results don't say where a player is from; SmashWiki's "Smasher:" pages do, in the
// infobox's `country` and `location` lines (text under CC BY-SA 4.0, credited on the page).
//
// A tag only gets a region in a game the wiki page lists a main for (mainssbm, mainssbu, ...), so a common tag
// isn't given a stranger's country; a tag whose page is a list of several players gets none.
//
// Run by hand when the list of players has grown (about a minute; one request a second, 50 pages each):
//   node --env-file=.env.local tools/smashwiki-regions/build.mjs
// It reads the saved top 8s as a guest (the public key in .env.local) and writes the file. Nothing is run
// from what it downloads.
import fs from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Run with --env-file=.env.local (the public Supabase settings).");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nameKey = (name) => name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); // as src/lib/playerLinks.ts
const tagOnly = (name) => name.split(" | ").at(-1).trim();

// 1. The tags: every top 8 placing of a singles, offline main event; kept when placed twice or won once.
const rows = [];
for (let from = 0; ; from += 1000) {
  const res = await fetch(`${url}/rest/v1/major_events?select=top8&teams=eq.false&online=eq.false&order=major_slug,event_id&offset=${from}&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`major_events: ${res.status}`);
  const page = await res.json();
  rows.push(...page);
  if (page.length < 1000) break;
}
const seen = new Map();
for (const r of rows)
  for (const p of r.top8 ?? []) {
    if (p.place > 8 || p.name.includes(" / ")) continue;
    const tag = tagOnly(p.name);
    const had = seen.get(tag) ?? { n: 0, won: false };
    seen.set(tag, { n: had.n + 1, won: had.won || p.place === 1 });
  }
const tags = [...seen].filter(([, v]) => v.n >= 2 || v.won).map(([t]) => t).filter((t) => !/[|#<>[\]{}]/.test(t) && nameKey(t).length >= 2);
console.log(rows.length, "brackets,", tags.length, "tags");

// 2. Their SmashWiki pages, 50 at a time.
const GAMES = { ssb: "smash64", ssbm: "melee", ssbb: "brawl", ssb4: "smash4", ssbu: "ultimate", pm: "pplus" };
const clean = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
const field = (box, name) => {
  const m = box.match(new RegExp("^\\|\\s*" + name + "\\s*=[ \\t]*(.*)$", "m"));
  return m ? clean(m[1]) : "";
};
const out = {};
for (let i = 0; i < tags.length; i += 50) {
  const batch = tags.slice(i, i + 50);
  const api = `https://www.ssbwiki.com/api.php?action=query&format=json&redirects=1&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(batch.map((t) => `Smasher:${t}`).join("|"))}`;
  const res = await fetch(api, { headers: { "User-Agent": "smashy-site-builder (arcade regions)" } });
  const j = await res.json();
  // asked title -> the page it ended on (the wiki tidies titles, then follows redirects)
  const step = new Map([...(j.query?.normalized ?? []), ...(j.query?.redirects ?? [])].map((x) => [x.from, x.to]));
  const finalOf = (title) => {
    let t = title;
    for (let k = 0; k < 4 && step.has(t); k++) t = step.get(t);
    return t;
  };
  const pages = new Map(Object.values(j.query?.pages ?? {}).map((p) => [p.title, p.revisions?.[0]?.slots?.main?.["*"] ?? ""]));
  for (const tag of batch) {
    const text = pages.get(finalOf(`Smasher:${tag}`)) ?? "";
    const start = text.indexOf("{{Infobox Smasher");
    if (start < 0) continue; // no page, or a list of several players
    const box = text.slice(start, start + 6000);
    // The wiki spells some countries several ways; one spelling each, so two players' countries can be compared.
    const raw = field(box, "country");
    const country = /^(usa|u\.s\.a?\.?|united states( of america)?)$/i.test(raw) ? "United States" : /^the netherlands$/i.test(raw) ? "Netherlands" : /^(uk|united kingdom)$/i.test(raw) ? "United Kingdom" : raw;
    if (!country) continue;
    const place = field(box, "location").split(",").at(-1)?.trim() ?? "";
    const games = Object.entries(GAMES).filter(([suffix]) => new RegExp("^\\|\\s*main" + suffix + "\\s*=[ \\t]*\\S", "m").test(box)).map(([, g]) => g);
    if (!games.length) continue;
    out[nameKey(tag)] = { country, ...(place && place !== country ? { place } : {}), games };
  }
  await sleep(1000);
}
const keys = Object.keys(out).sort();
fs.writeFileSync(
  "src/lib/arcadeRegions.ts",
  `// MADE BY tools/smashwiki-regions/build.mjs: don't edit by hand. Where players are from, as their SmashWiki
// pages say (https://www.ssbwiki.com, text under CC BY-SA 4.0), for the Arcade's "Guess the player" (round 952).
// Keyed by the tag's name key; \`games\` are the games that page lists a main for: a region only counts there.
import type { GameKey } from "./games";

export type PlayerRegion = { country: string; place?: string; games: GameKey[] };
export const PLAYER_REGIONS: Record<string, PlayerRegion> = {
${keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])},`).join("\n")}
};
`,
);
console.log(keys.length, "players with a region");
