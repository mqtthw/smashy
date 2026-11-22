// Adds Smashy's starter content to the database: the official @smashyhq account, starter guides and
// resource links, and a San Antonio scene with starter rulesets. Safe to run again: anything already
// there is skipped. Writes to whichever database .env.local points at (the live one).
//
//   node scripts/seed/seed-starter.mjs                       (dry run: shows what it would add)
//   node scripts/seed/seed-starter.mjs --apply               (adds it)
//   node scripts/seed/seed-starter.mjs --apply --admin=blair (also makes @blair a San Antonio admin)
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { CHARACTER_GUIDES } from "./character-guides.mjs";
import { syncRuleset } from "./ruleset-sync.mjs";
import { HIGHLIGHTS as STARTER, RULESETS, SCENE, SMASHY_PROFILE } from "./starter-content.mjs";

const HIGHLIGHTS = [...STARTER, ...CHARACTER_GUIDES];

const apply = process.argv.includes("--apply");
const adminHandle = process.argv.find((a) => a.startsWith("--admin="))?.slice(8);
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const say = (msg) => console.log(`${apply ? "" : "[dry run] "}${msg}`);
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// 1. The @smashyhq account (no password: nobody signs in as it; content is added from the server).
let smashyId = must(await db.from("profiles").select("id").eq("handle", SMASHY_PROFILE.handle).maybeSingle())?.id ?? null;
if (smashyId) say(`@${SMASHY_PROFILE.handle} already exists`);
else {
  say(`create the @${SMASHY_PROFILE.handle} account`);
  if (apply) {
    const { data, error } = await db.auth.admin.createUser({ email: `official+${randomUUID().slice(0, 8)}@smashy.invalid`, email_confirm: true });
    if (error) throw error;
    smashyId = data.user.id;
    must(await db.from("invite_redemptions").insert({ user_id: smashyId, code: null }));
    must(await db.from("private_profile_data").insert({ user_id: smashyId, date_of_birth: "2000-01-01" })); // an organization, counted as adult
    must(await db.from("profiles").insert({ id: smashyId, ...SMASHY_PROFILE }));
  }
}

// 2. Starter guides and resource links.
const existing = smashyId ? must(await db.from("highlights").select("title").eq("author_id", smashyId)).map((h) => h.title) : [];
for (const h of HIGHLIGHTS) {
  if (existing.includes(h.title)) {
    say(`skip (already there): ${h.title}`);
    continue;
  }
  say(`add ${h.game} ${h.type}: ${h.title}`);
  if (!apply) continue;
  const { error } = await db.from("highlights").insert({ author_id: smashyId, character: null, url: null, guide_body: null, ...h });
  // Accounts can add 10 resources an hour (anti-spam rule); the rest wait for the next run.
  if (error?.code === "P0429") {
    console.log(`  waiting: the hourly limit was reached. Run this again in an hour to add the rest.`);
    break;
  }
  if (error) throw error;
}

// 3. The San Antonio scene, run by @smashyhq (and optionally a person).
let scene = must(await db.from("scenes").select("id, status").eq("slug", SCENE.slug).maybeSingle());
if (scene) say(`scene ${SCENE.name} already exists (${scene.status})`);
else {
  say(`create scene ${SCENE.name}`);
  if (apply) scene = must(await db.from("scenes").insert({ ...SCENE, status: "active", requested_by: smashyId }).select("id, status").single());
}
const admins = [smashyId];
if (adminHandle) {
  const person = must(await db.from("profiles").select("id").eq("handle", adminHandle).maybeSingle());
  if (!person) throw new Error(`No profile @${adminHandle}`);
  admins.push(person.id);
}
for (const id of admins) {
  if (!id || !scene) continue;
  say(`make ${id === smashyId ? "@smashyhq" : `@${adminHandle}`} a ${SCENE.name} admin`);
  if (apply) must(await db.from("scene_admins").upsert({ scene_id: scene.id, user_id: id, status: "active" }, { onConflict: "scene_id,user_id" }));
}

// 4. The scene's rulesets: added, renamed, or brought up to the version in starter-content.mjs.
for (const r of RULESETS) await syncRuleset({ db, must, say, apply, scene, smashyId, ruleset: r, firstChangelog: "Starter ruleset" });
console.log(apply ? "Done." : "Dry run only. Add --apply to write this to the database.");
