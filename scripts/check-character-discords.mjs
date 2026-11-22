// Re-checks every character Discord invite in src/lib/characterDiscords.ts with Discord's public
// invite lookup (read only): is it still valid, and which server does it open?
//   node scripts/check-character-discords.mjs
import { readFileSync } from "node:fs";

const src = readFileSync("src/lib/characterDiscords.ts", "utf8");
const rows = [...src.matchAll(/"([a-z0-9-]+)": \{ name: "((?:[^"\]|\.)*)", invite: "https:\/\/discord\.gg\/([A-Za-z0-9-]+)" \}/g)];
let bad = 0;
for (const [, key, name, code] of rows) {
  const res = await fetch(`https://discord.com/api/v10/invites/${code}`, { headers: { "User-Agent": "SmashyLinkCheck/1.0" } });
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    await new Promise((r) => setTimeout(r, ((j.retry_after ?? 2) + 0.5) * 1000));
  }
  const j = res.ok ? await res.json() : null;
  if (!j) bad++;
  console.log(`${j ? "ok " : "BAD"} ${key}: ${j ? j.guild?.name : `invite ${code} no longer works`}${j && j.guild?.name !== JSON.parse(`"${name}"`) ? ` (was "${name}")` : ""}`);
  await new Promise((r) => setTimeout(r, 1200));
}
console.log(`${rows.length - bad} of ${rows.length} work`);
process.exit(bad ? 1 : 0);
