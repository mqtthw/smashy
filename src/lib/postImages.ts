// Images on posts: upload (shrink, strip hidden data, safety check, store), attach to a post, and
// clean up files nobody uses anymore. Server-only.
import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { blockedReason, checkImage, hasImageSafetyKey } from "./imageSafety";
import { overLimit } from "./limits";
import { POST_IMAGES_BUCKET as BUCKET, postImageUrl } from "./postImageLinks";
import { createAdminClient } from "./supabase/admin";

export const MAX_POST_IMAGES = 4;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // what we accept from the browser (it shrinks first)
const MAX_SIDE = 1600; // stored images are at most 1600px on their longest side
const UPLOADS_PER_HOUR = 30;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type UploadedImage = { id: string; url: string; width: number; height: number };

/**
 * Makes the stored copy: turned upright, at most 1600px, saved as WebP. Re-encoding drops everything
 * hidden in the file (camera details, and GPS location from phone photos). GIFs keep their first frame.
 */
export async function processImage(input: Buffer) {
  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Uploads one image for a post someone is writing. A string is a message for them. */
export async function uploadPostImage(userId: string, file: File): Promise<UploadedImage | string> {
  if (!hasImageSafetyKey()) return "Photo uploads aren't switched on yet.";
  if (!ACCEPTED.includes(file.type)) return "Use a JPG, PNG, WebP or GIF image.";
  if (file.size > MAX_UPLOAD_BYTES) return "That image is too big (8 MB max).";

  const db = createAdminClient();
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db.from("post_images").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("created_at", hourAgo);
  if ((count ?? 0) >= UPLOADS_PER_HOUR) return "You're adding photos too fast. Try again in a bit.";
  // Counted before the paid safety check, so blocked photos (never saved) count too (round 637).
  const tooMany = await overLimit("photo_check");
  if (tooMany) return tooMany;

  let image: Awaited<ReturnType<typeof processImage>>;
  try {
    image = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return "That file couldn't be read as an image.";
  }

  try {
    const reason = blockedReason(await checkImage(image.data));
    if (reason) {
      console.warn("Image blocked by safety check", { userId, reason });
      return "This image can't be posted on Smashy. It looks like it breaks the rules (Smashy has teen users).";
    }
  } catch (e) {
    console.error("Image safety check failed", e instanceof Error ? e.message : e);
    return "Couldn't check the image right now. Please try again.";
  }

  const path = `${userId}/${randomUUID()}.webp`;
  const { error: upError } = await db.storage.from(BUCKET).upload(path, image.data, { contentType: "image/webp", cacheControl: "31536000" });
  if (upError) {
    console.error("Image upload failed", upError.message);
    return "Couldn't save the image. Please try again.";
  }
  const { data, error } = await db.from("post_images").insert({ user_id: userId, path, width: image.width, height: image.height }).select("id").single();
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    console.error("Image row failed", error.message);
    return "Couldn't save the image. Please try again.";
  }
  return { id: data.id, url: postImageUrl(path), width: image.width, height: image.height };
}

/** Reads the composer's list of images ([{ id, alt }]) safely. */
export function parseImageList(raw: FormDataEntryValue | null): { id: string; alt: string }[] {
  try {
    const list = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(list)) return [];
    return list
      .filter((i) => i && typeof i.id === "string" && /^[0-9a-f-]{36}$/.test(i.id))
      .slice(0, MAX_POST_IMAGES)
      .map((i) => ({ id: i.id, alt: typeof i.alt === "string" ? i.alt.trim().slice(0, 300) : "" }));
  } catch {
    return [];
  }
}

/** Checks the images are this person's and not used yet. A string is a message for them. */
export async function checkImagesUsable(userId: string, images: { id: string }[]): Promise<string | null> {
  if (!images.length) return null;
  const { data } = await createAdminClient().from("post_images").select("id").in("id", images.map((i) => i.id)).eq("user_id", userId).is("post_id", null);
  return (data ?? []).length === images.length ? null : "One of your photos expired. Remove it and add it again.";
}

/** Puts the uploaded images on the post, in order. Returns false if any couldn't be attached. */
export async function attachImages(userId: string, postId: string, images: { id: string; alt: string; position?: number }[]): Promise<boolean> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const results = await Promise.all(
    images.map((img, i) =>
      db
        .from("post_images")
        .update({ post_id: postId, position: img.position ?? i, alt: img.alt, attached_at: now })
        .eq("id", img.id)
        .eq("user_id", userId)
        .is("post_id", null)
        .select("id"),
    ),
  );
  const failed = results.filter((r) => r.error || !r.data?.length);
  for (const r of failed) console.error("attachImages failed", r.error?.message ?? "no row");
  return failed.length === 0;
}

/**
 * Deletes image files nobody can see anymore: from deleted posts, from posts moderators removed,
 * and uploads that never made it into a post (after a day). Safe to run any time.
 */
export async function cleanupPostImages() {
  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 86400e3).toISOString();
  const [{ data: loose }, { data: removed }] = await Promise.all([
    db.from("post_images").select("id, path").is("post_id", null).or(`attached_at.not.is.null,created_at.lt."${dayAgo}"`).limit(500),
    db.from("post_images").select("id, path, post:posts!inner ( removed_at )").not("post.removed_at", "is", null).limit(500),
  ]);
  const gone = [...(loose ?? []), ...(removed ?? [])] as { id: string; path: string }[];
  if (!gone.length) return 0;
  const { error } = await db.storage.from(BUCKET).remove(gone.map((g) => g.path));
  if (error) throw error;
  await db.from("post_images").delete().in("id", gone.map((g) => g.id));
  return gone.length;
}

/** Deletes a post's photos right away (a moderator removed the post: the files stop working too). */
export async function deletePostImages(postId: string) {
  const db = createAdminClient();
  const { data } = await db.from("post_images").select("id, path").eq("post_id", postId);
  if (!data?.length) return;
  const { error } = await db.storage.from(BUCKET).remove(data.map((d) => d.path));
  if (error) throw error;
  await db.from("post_images").delete().in("id", data.map((d) => d.id));
}

/**
 * A post photo as a JPEG data URL for link-preview cards (the card drawer can't read WebP).
 * Only call with a path the guest was allowed to see. `bucket`: another storage spot holding a WebP
 * picture, such as a video's still picture in "post-videos".
 */
export async function postImageForCard(path: string, bucket: string = BUCKET): Promise<string | null> {
  try {
    const { data, error } = await createAdminClient().storage.from(bucket).download(path);
    if (error || !data) return null;
    const jpeg = await sharp(Buffer.from(await data.arrayBuffer()))
      .resize({ width: 1200, height: 630, fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}
