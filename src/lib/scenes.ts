// Loading scenes and rulesets (server-side, as the current user so privacy rules apply).
import type { GameKey } from "./games";
import type { FieldValue } from "./rulesetFields";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export type Scene = {
  id: string;
  slug: string;
  name: string;
  region: string;
  cities: string[];
  games: GameKey[];
  description: string | null;
  status: "pending" | "active" | "rejected";
  links: SceneLink[]; // the scene's Discord, start.gg pages, socials (set by its admins)
};

export type SceneLink = { label: string; url: string };
export const MAX_SCENE_LINKS = 6;

export type RulesetVersion = {
  id: string;
  rulesetId: string;
  version: number;
  rules: Record<string, FieldValue>;
  notes: string | null;
  changelog: string | null;
  publishedAt: string;
  publishedBy: string | null; // tag
};

export type RulesetSummary = {
  id: string;
  sceneId: string;
  sceneSlug: string;
  sceneName: string;
  game: GameKey;
  name: string;
  latest: RulesetVersion | null;
};

const SCENE_FIELDS = "id, slug, name, region, cities, games, description, status, links";

/** Site admins are checked with the secret key (the table is hidden from everyone else). */
export async function isSiteAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await createAdminClient().from("site_admins").select("user_id").eq("user_id", userId).maybeSingle().throwOnError();
  return !!data;
}

export async function isSceneAdmin(sceneId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("scene_admins")
    .select("status")
    .eq("scene_id", sceneId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()
    .throwOnError();
  return !!data;
}

export async function getActiveScenes(): Promise<Scene[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("scenes").select(SCENE_FIELDS).eq("status", "active").order("name").throwOnError();
  return (data ?? []) as Scene[];
}

/** Scenes the user requested that aren't approved yet. */
export async function getMyPendingScenes(userId: string): Promise<Scene[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("scenes").select(SCENE_FIELDS).eq("requested_by", userId).neq("status", "active").throwOnError();
  return (data ?? []) as Scene[];
}

export async function getScene(slug: string) {
  const supabase = await createClient();
  const { data: scene } = await supabase.from("scenes").select(SCENE_FIELDS).eq("slug", slug).maybeSingle().throwOnError();
  if (!scene) return null;
  const [{ data: admins }, rulesets] = await Promise.all([
    supabase.from("scene_admins").select("user_id, status, profile:profiles(tag)").eq("scene_id", scene.id),
    getSceneRulesets(scene.id),
  ]);
  return {
    scene: scene as Scene,
    admins: (admins ?? []).map((a) => ({
      userId: a.user_id as string,
      status: a.status as string,
      tag: (a.profile as unknown as { tag: string } | null)?.tag ?? "Unknown",
    })),
    rulesets,
  };
}

type VersionRow = {
  id: string;
  ruleset_id: string;
  version: number;
  rules: Record<string, FieldValue>;
  notes: string | null;
  changelog: string | null;
  published_at: string;
  publisher: { tag: string } | null;
};
const VERSION_FIELDS = "id, ruleset_id, version, rules, notes, changelog, published_at, publisher:profiles(tag)";

function toVersion(v: VersionRow): RulesetVersion {
  return {
    id: v.id,
    rulesetId: v.ruleset_id,
    version: v.version,
    rules: v.rules ?? {},
    notes: v.notes,
    changelog: v.changelog,
    publishedAt: v.published_at,
    publishedBy: v.publisher?.tag ?? null,
  };
}

type RulesetRow = {
  id: string;
  scene_id: string;
  game: GameKey;
  name: string;
  scene: { slug: string; name: string } | null;
  versions: VersionRow[];
};
const RULESET_FIELDS_SQL = `id, scene_id, game, name, scene:scenes(slug, name), versions:ruleset_versions(${VERSION_FIELDS})`;

function toSummary(r: RulesetRow): RulesetSummary {
  const latest = [...(r.versions ?? [])].sort((a, b) => b.version - a.version)[0];
  return {
    id: r.id,
    sceneId: r.scene_id,
    sceneSlug: r.scene?.slug ?? "",
    sceneName: r.scene?.name ?? "",
    game: r.game,
    name: r.name,
    latest: latest ? toVersion(latest) : null,
  };
}

export async function getSceneRulesets(sceneId: string): Promise<RulesetSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("rulesets").select(RULESET_FIELDS_SQL).eq("scene_id", sceneId).order("game").throwOnError();
  return ((data ?? []) as unknown as RulesetRow[]).map(toSummary);
}

/** All visible rulesets (optionally for one game), for compare pickers. */
export async function getAllRulesets(game?: GameKey): Promise<RulesetSummary[]> {
  const supabase = await createClient();
  let q = supabase.from("rulesets").select(RULESET_FIELDS_SQL).order("name").limit(200);
  if (game) q = q.eq("game", game);
  const { data } = await q.throwOnError();
  return ((data ?? []) as unknown as RulesetRow[]).map(toSummary);
}

/** A ruleset with its full version history (newest first). */
export async function getRuleset(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("rulesets").select(RULESET_FIELDS_SQL).eq("id", id).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as RulesetRow;
  return {
    ...toSummary(row),
    versions: [...(row.versions ?? [])].sort((a, b) => b.version - a.version).map(toVersion),
  };
}

/** One version plus its ruleset's name/scene/game (for the compare view). */
export async function getVersionWithRuleset(versionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) return null;
  const supabase = await createClient();
  const { data: v } = await supabase.from("ruleset_versions").select(VERSION_FIELDS).eq("id", versionId).maybeSingle().throwOnError();
  if (!v) return null;
  const version = toVersion(v as unknown as VersionRow);
  const ruleset = await getRuleset(version.rulesetId);
  return ruleset ? { version, ruleset } : null;
}

/** Rulesets the user can attach to events (they're an active admin of the scene). */
export async function getMyAdminRulesets(userId: string | null): Promise<RulesetSummary[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data: roles } = await supabase.from("scene_admins").select("scene_id").eq("user_id", userId).eq("status", "active").throwOnError();
  const sceneIds = (roles ?? []).map((r) => r.scene_id);
  if (!sceneIds.length) return [];
  const { data } = await supabase.from("rulesets").select(RULESET_FIELDS_SQL).in("scene_id", sceneIds).throwOnError();
  return ((data ?? []) as unknown as RulesetRow[]).map(toSummary);
}

export type Attachment = { id: string; game: GameKey; targetType: "series" | "tournament"; targetKey: string; ruleset: RulesetSummary };

/** Rulesets attached to a tournament and/or its weekly series. A tournament-specific one wins over the series one. */
export async function getAttachedRulesets(targets: { tournamentSlug?: string; seriesId?: string }): Promise<Attachment[]> {
  const supabase = await createClient();
  const safe = (k?: string) => (k && /^[a-z0-9-]{1,200}$/.test(k) ? k : null); // keys are slugs; keep the filter syntax safe
  const t = safe(targets.tournamentSlug);
  const s = safe(targets.seriesId);
  const ors = [
    t && `and(target_type.eq.tournament,target_key.eq.${t})`,
    s && `and(target_type.eq.series,target_key.eq.${s})`,
  ].filter(Boolean);
  if (!ors.length) return [];
  const { data } = await supabase
    .from("event_rulesets")
    .select(`id, game, target_type, target_key, ruleset:rulesets(${RULESET_FIELDS_SQL})`)
    .or(ors.join(","))
    .throwOnError();
  const all = (data ?? [])
    .filter((a) => a.ruleset)
    .map((a) => ({
      id: a.id as string,
      game: a.game as GameKey,
      targetType: a.target_type as "series" | "tournament",
      targetKey: a.target_key as string,
      ruleset: toSummary(a.ruleset as unknown as RulesetRow),
    }));
  const byGame = new Map<GameKey, Attachment>();
  for (const a of all) {
    const existing = byGame.get(a.game);
    if (!existing || a.targetType === "tournament") byGame.set(a.game, a);
  }
  return [...byGame.values()];
}

/** Site admin queue: pending scenes and admin requests. */
export async function getPendingRequests() {
  const db = createAdminClient();
  const [{ data: scenes, error: scenesError }, { data: adminReqs, error: adminError }] = await Promise.all([
    db
      .from("scenes")
      .select(`${SCENE_FIELDS}, created_at, requester:profiles!scenes_requested_by_fkey(tag)`)
      .eq("status", "pending")
      .order("created_at"),
    db
      .from("scene_admins")
      .select("scene_id, user_id, message, created_at, profile:profiles(tag), scene:scenes(name, slug, status)")
      .eq("status", "pending")
      .order("created_at"),
  ]);
  // Never let the approval queue look empty because of a query error.
  if (scenesError || adminError) throw scenesError ?? adminError;
  return {
    scenes: (scenes ?? []).map((s) => ({ ...(s as unknown as Scene), requester: (s.requester as unknown as { tag: string } | null)?.tag ?? "Unknown" })),
    // Only requests for approved scenes are listed: a new scene's creator is approved with the scene,
    // and anyone else who asked shows up here once it's active.
    adminRequests: (adminReqs ?? [])
      .filter((r) => (r.scene as unknown as { status: string } | null)?.status === "active")
      .map((r) => ({
        sceneId: r.scene_id as string,
        userId: r.user_id as string,
        message: r.message as string | null,
        tag: (r.profile as unknown as { tag: string } | null)?.tag ?? "Unknown",
        sceneName: (r.scene as unknown as { name: string }).name,
      })),
  };
}
