// Shared by the seed scripts: add a ruleset, rename one, or publish a newer version of one.
//
// A ruleset in a seed file is { game, name, rules, notes } plus, when it has changed since it was first added:
//   was: ["an earlier name"]   it is renamed in place, so events that already use it keep it
//   version: 2                 the version this file describes (1 when left out)
//   changelog: "what changed"  shown in the ruleset's history for that version
// Nothing is ever overwritten: a ruleset that is already at this version (or a later one, published
// by a scene admin in the app) is skipped.

/** @returns {Promise<void>} */
export async function syncRuleset({ db, must, say, apply, scene, smashyId, ruleset: r, firstChangelog }) {
  const byName = async (name) =>
    scene ? must(await db.from("rulesets").select("id").eq("scene_id", scene.id).eq("game", r.game).eq("name", name).maybeSingle()) : null;

  let found = await byName(r.name);
  for (const old of found ? [] : (r.was ?? [])) {
    const earlier = await byName(old);
    if (!earlier) continue;
    say(`rename ruleset: "${old}" -> "${r.name}"`);
    if (apply) must(await db.from("rulesets").update({ name: r.name }).eq("id", earlier.id));
    found = earlier;
    break;
  }

  if (!found) {
    say(`add ruleset: ${r.name}`);
    if (apply && scene) {
      const rs = must(await db.from("rulesets").insert({ scene_id: scene.id, game: r.game, name: r.name, created_by: smashyId }).select("id").single());
      must(await db.from("ruleset_versions").insert({ ruleset_id: rs.id, version: 1, rules: r.rules, notes: r.notes, changelog: firstChangelog, published_by: smashyId }));
    }
    return;
  }

  const want = r.version ?? 1;
  const latest = must(await db.from("ruleset_versions").select("version").eq("ruleset_id", found.id).order("version", { ascending: false }).limit(1).maybeSingle())?.version ?? 0;
  if (latest >= want) {
    say(`skip ruleset (already at version ${latest}): ${r.name}`);
    return;
  }
  say(`publish version ${latest + 1} of ${r.name}: ${r.changelog ?? "Updated"}`);
  say(`    starters: ${(r.rules.starters ?? []).join(", ")}`);
  say(`    counterpicks: ${(r.rules.counterpicks ?? []).join(", ") || "none"}`);
  if (apply) {
    must(await db.from("ruleset_versions").insert({ ruleset_id: found.id, version: latest + 1, rules: r.rules, notes: r.notes, changelog: r.changelog ?? "Updated", published_by: smashyId }));
  }
}
