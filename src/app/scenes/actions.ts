"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { allFields, sanitizeRules } from "@/lib/rulesetFields";
import { SCENE_EMOJI_NAME } from "@/lib/reactions";
import { saveSceneEmoji } from "@/lib/sceneSocial";
import { isSceneAdmin, isSiteAdmin } from "@/lib/scenes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export type FormResult = { error?: string };

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function gamesFrom(formData: FormData): GameKey[] {
  return formData.getAll("games").map(String).filter((g): g is GameKey => GAME_KEYS.includes(g as GameKey));
}

// ---------- Requests ----------

export async function requestScene(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const userId = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const cities = String(formData.get("cities") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 20);
  const games = gamesFrom(formData);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500) || null;
  const slug = slugify(name);
  const t = await getT();

  if (name.length < 2 || name.length > 60 || !slug || slug === "request") return { error: t("media.sc.err.name") };
  if (!cities.length) return { error: t("media.sc.err.city") };
  if (!games.length) return { error: t("media.sc.err.game") };

  const supabase = await createClient();
  // The scene is in the requester's region (scenes from before regions use a US state code like "TX").
  const { data: me } = await supabase.from("profiles").select("region").eq("id", userId).maybeSingle();
  const region = typeof me?.region === "string" && me.region ? me.region : "US-TX";
  const { data: scene, error } = await supabase
    .from("scenes")
    .insert({ slug, name, cities, games, description, requested_by: userId, region })
    .select("id")
    .single();
  if (error) return { error: t(error.code === "23505" ? "media.sc.err.exists" : "media.sc.err.request") };
  // The requester becomes the scene's first admin once you approve the scene.
  await supabase.from("scene_admins").insert({ scene_id: scene.id, user_id: userId, message: "Scene creator" });
  redirect("/scenes?requested=1");
}

export async function requestSceneAdmin(sceneId: string, message: string): Promise<FormResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("scene_admins")
    .insert({ scene_id: sceneId, user_id: userId, message: message.trim().slice(0, 300) || null });
  if (error && error.code !== "23505") return { error: (await getT())("media.sc.err.request") };
  refresh();
  return {};
}

// ---------- Site admin approvals ----------

async function requireSiteAdmin() {
  const userId = await requireUser();
  if (!(await isSiteAdmin(userId))) redirect("/");
  return userId;
}

export async function decideScene(sceneId: string, approve: boolean) {
  await requireSiteAdmin();
  const db = createAdminClient();
  await db.from("scenes").update({ status: approve ? "active" : "rejected" }).eq("id", sceneId).eq("status", "pending");
  const { data: scene } = await db.from("scenes").select("requested_by").eq("id", sceneId).single();
  // Approving a scene approves only its creator's admin request. Anyone else who asked to be an
  // admin of it stays pending and shows up in the normal queue to be looked at one by one.
  // Rejecting the scene rejects every request on it.
  const requests = db.from("scene_admins").update({ status: approve ? "active" : "rejected" }).eq("scene_id", sceneId).eq("status", "pending");
  if (!approve) await requests;
  else if (scene?.requested_by) await requests.eq("user_id", scene.requested_by);
  // Let the requester know.
  if (scene?.requested_by) {
    await db.from("notifications").insert({ user_id: scene.requested_by, type: approve ? "scene_approved" : "scene_rejected", scene_id: sceneId });
  }
  refresh();
}

export async function decideSceneAdmin(sceneId: string, userId: string, approve: boolean) {
  await requireSiteAdmin();
  await createAdminClient()
    .from("scene_admins")
    .update({ status: approve ? "active" : "rejected" })
    .eq("scene_id", sceneId)
    .eq("user_id", userId)
    .eq("status", "pending");
  await createAdminClient()
    .from("notifications")
    .insert({ user_id: userId, type: approve ? "admin_approved" : "admin_rejected", scene_id: sceneId });
  refresh();
}

// ---------- Rulesets ----------

/** Read the editor form into a clean rules object. */
function rulesFromForm(game: GameKey, formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const f of allFields(game)) {
    if (f.type === "stages") {
      const custom = String(formData.get(`f_${f.key}_custom`) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      raw[f.key] = [...formData.getAll(`f_${f.key}`).map(String), ...custom];
    } else {
      raw[f.key] = formData.get(`f_${f.key}`);
    }
  }
  return sanitizeRules(game, raw);
}

export async function createRuleset(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const userId = await requireUser();
  const sceneId = String(formData.get("scene_id"));
  const game = String(formData.get("game")) as GameKey;
  const name = String(formData.get("name") ?? "").trim();
  const t = await getT();
  if (!GAME_KEYS.includes(game)) return { error: t("media.err.pickGame") };
  if (name.length < 2 || name.length > 80) return { error: t("media.sc.err.rulesetName") };
  if (!(await isSceneAdmin(sceneId, userId))) return { error: t("media.sc.err.onlyAdminsPublish") };

  const supabase = await createClient();
  const { data: ruleset, error } = await supabase
    .from("rulesets")
    .insert({ scene_id: sceneId, game, name, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: t("media.sc.err.create") };

  const { error: vError } = await supabase.from("ruleset_versions").insert({
    ruleset_id: ruleset.id,
    version: 1,
    rules: rulesFromForm(game, formData),
    notes: String(formData.get("notes") ?? "").trim().slice(0, 4000) || null,
    changelog: "First version",
    published_by: userId,
  });
  if (vError) return { error: t("media.sc.err.saveRules") };
  redirect(`/rulesets/${ruleset.id}`);
}

export async function publishVersion(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const userId = await requireUser();
  const rulesetId = String(formData.get("ruleset_id"));
  const changelog = String(formData.get("changelog") ?? "").trim();
  const t = await getT();
  if (changelog.length < 3) return { error: t("media.sc.err.changelog") };

  const supabase = await createClient();
  const { data: ruleset } = await supabase.from("rulesets").select("id, game, scene_id").eq("id", rulesetId).maybeSingle();
  if (!ruleset) return { error: t("media.sc.err.notFound") };
  if (!(await isSceneAdmin(ruleset.scene_id, userId))) return { error: t("media.sc.err.onlyAdminsChanges") };

  const { data: latest } = await supabase
    .from("ruleset_versions")
    .select("version")
    .eq("ruleset_id", rulesetId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("ruleset_versions").insert({
    ruleset_id: rulesetId,
    version: (latest?.version ?? 0) + 1,
    rules: rulesFromForm(ruleset.game as GameKey, formData),
    notes: String(formData.get("notes") ?? "").trim().slice(0, 4000) || null,
    changelog: changelog.slice(0, 500),
    published_by: userId,
  });
  if (error) {
    return { error: t(error.code === "23505" ? "media.sc.err.conflict" : "media.sc.err.publish") };
  }
  redirect(`/rulesets/${rulesetId}`);
}

// ---------- Attaching rulesets to events ----------

export async function attachRuleset(rulesetId: string, targetType: "series" | "tournament", targetKey: string): Promise<FormResult> {
  const userId = await requireUser();
  const t = await getT();
  if (!["series", "tournament"].includes(targetType) || !targetKey || targetKey.length > 200) return { error: t("media.sc.err.invalidEvent") };
  const supabase = await createClient();
  const { data: ruleset } = await supabase.from("rulesets").select("id, game").eq("id", rulesetId).maybeSingle();
  if (!ruleset) return { error: t("media.sc.err.notFound") };

  // Replace any existing ruleset for this event + game.
  await supabase.from("event_rulesets").delete().eq("target_type", targetType).eq("target_key", targetKey).eq("game", ruleset.game);
  const { error } = await supabase
    .from("event_rulesets")
    .insert({ ruleset_id: rulesetId, game: ruleset.game, target_type: targetType, target_key: targetKey, attached_by: userId });
  if (error) return { error: t(error.code === "23505" ? "media.sc.err.otherScene" : "media.sc.err.onlyAdminsAttach") };
  refresh();
  return {};
}

export async function detachRuleset(attachmentId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("event_rulesets").delete().eq("id", attachmentId);
  refresh();
}

// ---------- Membership & scene emojis ----------

/** Join or leave a scene. */
export async function setSceneMembership(sceneId: string, join: boolean): Promise<FormResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = join
    ? await supabase.from("scene_members").insert({ scene_id: sceneId, user_id: userId })
    : await supabase.from("scene_members").delete().eq("scene_id", sceneId).eq("user_id", userId);
  if (error && error.code !== "23505") return { error: (await getT())("media.sc.err.membership") };
  refresh();
  return {};
}

/** Scene admins: upload a custom emoji. It waits for a site admin to approve it. */
export async function uploadSceneEmoji(_prev: FormResult & { ok?: boolean }, formData: FormData): Promise<FormResult & { ok?: boolean }> {
  const userId = await requireUser();
  const sceneId = String(formData.get("scene_id") ?? "");
  const t = await getT();
  if (!(await isSceneAdmin(sceneId, userId))) return { error: t("media.sc.err.onlyAdminsEmoji") };
  const name = String(formData.get("name") ?? "").trim().toLowerCase().replace(/^:|:$/g, "");
  if (!SCENE_EMOJI_NAME.test(name)) return { error: t("media.sc.err.emojiName") };
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: t("media.sc.err.chooseImage") };
  const res = await saveSceneEmoji(sceneId, name, file, userId);
  if (res.ok) refresh();
  return res.error ? { error: (await getT())(res.error.key, res.error.values) } : { ok: res.ok };
}

/** Scene admins: update the description and links (Discord, start.gg, socials). https links only. */
export async function updateScene(sceneId: string, description: string, links: { label: string; url: string }[]): Promise<FormResult> {
  const userId = await requireUser();
  const t = await getT();
  if (!(await isSceneAdmin(sceneId, userId)) && !(await isSiteAdmin(userId))) return { error: t("media.sc.err.onlyAdminsEdit") };
  const text = String(description ?? "").trim().slice(0, 500) || null;
  const clean: { label: string; url: string }[] = [];
  for (const l of Array.isArray(links) ? links.slice(0, 6) : []) {
    const label = String(l?.label ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    const raw = String(l?.url ?? "").trim();
    if (!label && !raw) continue;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { error: t("media.sc.err.notFullLink", { link: raw || label }) };
    }
    if (url.protocol !== "https:") return { error: t("media.sc.err.https") };
    clean.push({ label: label || url.hostname.replace(/^www\./, ""), url: url.toString() });
  }
  const { error } = await createAdminClient().from("scenes").update({ description: text, links: clean }).eq("id", sceneId);
  if (error) return { error: t("media.err.couldntSave") };
  refresh();
  return {};
}
