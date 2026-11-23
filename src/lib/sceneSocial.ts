// Scene membership and scene emojis (server-side, as the signed-in user so privacy rules apply).
import { sceneEmojiUrl } from "./posts";
import { avatarUrl } from "./avatarLinks";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { MessageKey, Values } from "./i18n/core";

export type SceneEmojiItem = { id: string; name: string; url: string; status: "pending" | "approved" | "rejected" };

/** How many members a scene has, and whether this user is one. */
export async function getSceneMembership(sceneId: string, userId: string | null): Promise<{ count: number; isMember: boolean }> {
  const supabase = await createClient();
  const [{ count }, mine] = await Promise.all([
    supabase.from("scene_members").select("user_id", { count: "exact", head: true }).eq("scene_id", sceneId),
    userId ? supabase.from("scene_members").select("user_id").eq("scene_id", sceneId).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { count: count ?? 0, isMember: Boolean(mine.data) };
}

/** A scene's emojis. Everyone sees approved ones; the scene's admins also see their pending ones. */
export async function getSceneEmojis(sceneId: string): Promise<SceneEmojiItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("scene_emojis").select("id, name, image_path, status").eq("scene_id", sceneId).neq("status", "rejected").order("name");
  if (error) throw error;
  return (data ?? []).map((e) => ({ id: e.id, name: e.name, url: sceneEmojiUrl(e.image_path), status: e.status as SceneEmojiItem["status"] }));
}

/** Site admin queue: emojis waiting for approval, across scenes. */
export async function getPendingSceneEmojis() {
  const { data, error } = await createAdminClient()
    .from("scene_emojis")
    .select("id, name, image_path, created_at, scene:scenes(name, slug), uploader:profiles(tag)")
    .eq("status", "pending")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    url: sceneEmojiUrl(e.image_path),
    scene: e.scene as unknown as { name: string; slug: string } | null,
    uploader: (e.uploader as unknown as { tag: string } | null)?.tag ?? "Unknown",
  }));
}

const TYPES: Record<string, string> = { "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
export const EMOJI_MAX_BYTES = 256 * 1024;

/** Saves an uploaded emoji image and a pending emoji row. Caller must have checked the scene admin. */
/** `error`: a phrase key (and its values), shown in the uploader's language by the action. */
export async function saveSceneEmoji(sceneId: string, name: string, file: File, userId: string): Promise<{ ok?: boolean; error?: { key: MessageKey; values?: Values } }> {
  const ext = TYPES[file.type];
  if (!ext) return { error: { key: "media.emoji.err.type" } };
  if (file.size > EMOJI_MAX_BYTES) return { error: { key: "media.emoji.err.size" } };
  const db = createAdminClient();
  const path = `${sceneId}/${name}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error: upErr } = await db.storage.from("scene-emojis").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: { key: "media.emoji.err.upload" } };
  const { error } = await db.from("scene_emojis").insert({ scene_id: sceneId, name, image_path: path, created_by: userId });
  if (error) {
    await db.storage.from("scene-emojis").remove([path]);
    return { error: error.code === "23505" ? { key: "media.emoji.err.taken", values: { name } } : { key: "media.emoji.err.save" } };
  }
  return { ok: true };
}

/** Site admin: approve or reject a scene emoji (rejected images are deleted). */
export async function decideSceneEmoji(id: string, approve: boolean) {
  const db = createAdminClient();
  const { data } = await db.from("scene_emojis").update({ status: approve ? "approved" : "rejected" }).eq("id", id).select("image_path").single();
  if (!approve && data?.image_path) await db.storage.from("scene-emojis").remove([data.image_path]);
}

/** Some of a scene's members, newest first (teen members only show to signed-in people, like profiles). */
export async function getSceneMembers(sceneId: string, limit = 12): Promise<{ tag: string; handle: string; avatarUrl: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scene_members")
    .select("profile:profiles ( tag, handle, avatar_path )")
    .eq("scene_id", sceneId)
    .order("joined_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as { profile: { tag: string; handle: string; avatar_path: string | null } | null }[])
    .filter((m) => m.profile)
    .map((m) => ({ tag: m.profile!.tag, handle: m.profile!.handle, avatarUrl: avatarUrl(m.profile!.avatar_path) }));
}
