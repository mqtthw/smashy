// Adds the "Online" scene (run by @smashyhq) with standard online rulesets that hosted online events can
// use. Safe to run again: anything already there is skipped. Usage: node scripts/seed/online-rulesets.mjs [--apply]
//
// Slippi (Melee): the six ranked-legal stages with 4 stocks, 8 minutes, best of 3. Five are starters;
// Pokémon Stadium is a counterpick (from game 2 on). Striking order, bans and the re-pick rule are
// common tournament defaults (Slippi picks stages in-game). It was first added as "Slippi Ranked
// stage list" with all six stages as starters; version 2 fixed that.
//
// The Box: Hungrybox's online tournament series (later "The Cashbox"). Only the rules start.gg lists
// publicly are filled in (stages, bans, stage clause); stocks, timer and set length are left for the
// host to set on their event. Smashy isn't affiliated with Hungrybox or Team Liquid.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { syncRuleset } from "./ruleset-sync.mjs";

const apply = process.argv.includes("--apply");
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const say = (m) => console.log(`${apply ? "" : "[dry run] "}${m}`);
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const SCENE = {
  slug: "online",
  name: "Online",
  region: "Online",
  cities: [],
  games: ["melee", "ultimate"],
  description: "Standard rulesets for online events hosted on Smashy (netplay and Ultimate online).",
};

const SOURCE = "https://help.start.gg/en/articles/2552379-smash-ultimate-online-rulesets";
const RULESETS = [
  {
    game: "ultimate",
    name: "The Box (Hungrybox's online series)",
    rules: {
      starters: ["Battlefield", "Final Destination", "Pokémon Stadium 2", "Smashville", "Town and City"],
      counterpicks: ["Kalos Pokémon League", "Yoshi's Story"],
      game1_striking: "1-2-1",
      counterpick_bans: 2,
      dsr: "modified",
    },
    notes:
      `The stage list and stage rules from The Box, Hungrybox's online Ultimate series (later The Cashbox), as start.gg lists them publicly: ${SOURCE}\n` +
      "After each game the winner bans 2 stages; you can't counterpick the most recent stage you won on. " +
      "Stocks, timer and set length aren't listed publicly, so each event sets its own. Smashy isn't affiliated with Hungrybox or Team Liquid.",
  },
  {
    game: "ultimate",
    name: "The Box (SBF Edition)",
    rules: {
      starters: ["Battlefield", "Final Destination", "Pokémon Stadium 2", "Smashville", "Town and City"],
      counterpicks: ["Kalos Pokémon League", "Yoshi's Story", "Small Battlefield"],
      game1_striking: "1-2-1",
      counterpick_bans: 2,
      dsr: "modified",
    },
    notes: `The Box ruleset with Small Battlefield added as a counterpick, as start.gg lists it publicly: ${SOURCE}\nSmashy isn't affiliated with Hungrybox or Team Liquid.`,
  },
  {
    game: "melee",
    name: "Slippi",
    was: ["Slippi Ranked stage list"],
    version: 2,
    changelog: "Pokémon Stadium is a counterpick, not a starter. Renamed from \"Slippi Ranked stage list\".",
    rules: {
      stocks: 4,
      timer: 8,
      best_of: 3,
      starters: ["Battlefield", "Final Destination", "Yoshi's Story", "Fountain of Dreams", "Dream Land N64"],
      counterpicks: ["Pokémon Stadium"],
      game1_striking: "1-2-1",
      counterpick_bans: 1,
      dsr: "modified",
    },
    notes:
      "The six stages that are legal in Slippi Ranked, with its 4 stocks, 8 minutes and best-of-3 sets. Five are starters for game 1; Pokémon Stadium is a counterpick, so it can only be picked from game 2 on. " +
      "Slippi picks stages inside the game for ranked matches; in a bracket the players strike here instead, so the strike order (1-2-1), the 1 ban after each game and the re-pick rule (you can't go back to the last stage you won on) are common tournament defaults, not Slippi's own. " +
      "Each event can set its own set length. Smashy isn't affiliated with Project Slippi.",
  },
];

const smashyId = must(await db.from("profiles").select("id").eq("handle", "smashyhq").maybeSingle())?.id;
if (!smashyId) throw new Error("Run seed-starter.mjs first (the @smashyhq account is missing).");

let scene = must(await db.from("scenes").select("id").eq("slug", SCENE.slug).maybeSingle());
if (scene) say(`scene ${SCENE.name} already exists`);
else {
  say(`create scene ${SCENE.name}`);
  if (apply) scene = must(await db.from("scenes").insert({ ...SCENE, status: "active", requested_by: smashyId }).select("id").single());
}
if (scene && apply) must(await db.from("scene_admins").upsert({ scene_id: scene.id, user_id: smashyId, status: "active" }, { onConflict: "scene_id,user_id" }));

for (const r of RULESETS) await syncRuleset({ db, must, say, apply, scene, smashyId, ruleset: r, firstChangelog: "Added as a standard online ruleset" });
say("done");
