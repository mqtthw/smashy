// Registers the Smashy bot's slash commands with Discord (run once, and again when the commands change):
//   node scripts/discord-commands.mjs
// Reads DISCORD_APP_ID and DISCORD_BOT_TOKEN from .env.local. Prints the command names, never the keys.
import { readFileSync } from "node:fs";
import { COMMANDS } from "./discord-commands-list.mjs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const appId = env.DISCORD_APP_ID;
const token = env.DISCORD_BOT_TOKEN;
if (!appId || !token) {
  console.error("DISCORD_APP_ID and DISCORD_BOT_TOKEN must be in .env.local.");
  process.exit(1);
}

const commands = COMMANDS;

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});
const out = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`Discord said ${res.status}:`, JSON.stringify(out?.message ?? out));
  process.exit(1);
}
console.log("Registered:", out.map((c) => `/${c.name}`).join(", "));
