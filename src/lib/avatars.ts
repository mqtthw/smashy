// Profile pictures: upload (square, hidden data removed, safety-checked) and remove. Server-only.
import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AVATARS_BUCKET } from "./avatarLinks";
import { blockedReason, checkImage, hasImageSafetyKey } from "./imageSafety";
import { createAdminClient } from "./supabase/admin";

const SIDE = 400;

/** Deletes every picture file of this person (old ones too). */
export async function deleteAvatarFiles(userId: string, keep?: string) {
  const bucket = createAdminClient().storage.from(AVATARS_BUCKET);
  const { data } = await bucket.list(userId);
  const paths = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (paths.length) await bucket.remove(paths);
}

const MAX_BYTES = 8 * 1024 * 1024;

/** Sets someone's profile picture. A string is a message for them. */
export async function setAvatar(userId: string, file: File): Promise<string | null> {
  if (!hasImageSafetyKey()) return "Profile pictures aren't switched on yet.";
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return "Use a JPG, PNG, WebP or GIF image.";
  if (file.size > MAX_BYTES) return "That image is too big (8 MB max).";
  return saveAvatar(userId, Buffer.from(await file.arrayBuffer()));
}

/**
 * Uses someone's start.gg profile picture as their Smashy picture, only if they don't have one yet
 * (a picture they chose is never replaced). Best effort: returns false if anything goes wrong.
 */
export async function copyStartggAvatar(userId: string, url: string): Promise<boolean> {
  if (!hasImageSafetyKey()) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.hostname !== "images.start.gg") return false; // only start.gg's image server
  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(8_000), redirect: "error" });
    if (!res.ok || Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return false;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > MAX_BYTES) return false;
    return (await saveAvatar(userId, data, { onlyIfEmpty: true })) === null;
  } catch (e) {
    console.error("start.gg picture copy failed", e instanceof Error ? e.message : e);
    return false;
  }
}

const KEPT_THEIRS = "They already have a picture.";

async function saveAvatar(userId: string, input: Buffer, { onlyIfEmpty = false } = {}): Promise<string | null> {
  let data: Buffer;
  try {
    data = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize({ width: SIDE, height: SIDE, fit: "cover", position: "attention" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return "That file couldn't be read as an image.";
  }
  try {
    const reason = blockedReason(await checkImage(data));
    if (reason) return "This picture can't be used on Smashy. It looks like it breaks the rules (Smashy has teen users).";
  } catch (e) {
    console.error("Avatar safety check failed", e instanceof Error ? e.message : e);
    return "Couldn't check the picture right now. Please try again.";
  }
  const db = createAdminClient();
  const path = `${userId}/${randomUUID()}.webp`;
  const { error: upError } = await db.storage.from(AVATARS_BUCKET).upload(path, data, { contentType: "image/webp", cacheControl: "31536000" });
  if (upError) return "Couldn't save the picture. Please try again.";
  let update = db.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (onlyIfEmpty) update = update.is("avatar_path", null); // they picked one meanwhile: keep theirs
  const { data: saved, error } = await update.select("id");
  if (error || !saved?.length) {
    await db.storage.from(AVATARS_BUCKET).remove([path]);
    return error ? "Couldn't save the picture. Please try again." : KEPT_THEIRS;
  }
  await deleteAvatarFiles(userId, path); // the old one
  return null;
}

export async function removeAvatar(userId: string) {
  await createAdminClient().from("profiles").update({ avatar_path: null }).eq("id", userId);
  await deleteAvatarFiles(userId);
}

/** A profile picture as a PNG data URL for link-preview cards (the card drawer can't read WebP). */
export async function avatarForCard(path: string): Promise<string | null> {
  try {
    const { data, error } = await createAdminClient().storage.from(AVATARS_BUCKET).download(path);
    if (error || !data) return null;
    const png = await sharp(Buffer.from(await data.arrayBuffer())).resize(300, 300).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
