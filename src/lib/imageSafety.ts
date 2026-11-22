// Automatic safety check for uploaded images: Google Cloud Vision "SafeSearch".
// Server-only (the key must never reach the browser). Without a key, uploads are switched off:
// Smashy never stores an image that wasn't checked.
//
// Cost: the first 1,000 images a month are free, then about $1.50 per 1,000 (Google bills the
// Cloud project, which needs billing turned on).
import "server-only";

export const hasImageSafetyKey = () => Boolean(process.env.GOOGLE_VISION_API_KEY);

const LEVELS = ["UNKNOWN", "VERY_UNLIKELY", "UNLIKELY", "POSSIBLE", "LIKELY", "VERY_LIKELY"] as const;
type Level = (typeof LEVELS)[number];
export type SafeSearch = { adult: Level; racy: Level; violence: Level; medical: Level; spoof: Level };

const at = (l: Level) => LEVELS.indexOf(l);

/**
 * Smashy has teens, so: no nudity or sexual content ("adult" likely), nothing suggestive ("racy"
 * likely), no gore ("violence" very likely; fighting-game screenshots score low, real gore high).
 * Returns the reason it was blocked, or null if it's fine.
 */
export function blockedReason(s: SafeSearch): string | null {
  if (at(s.adult) >= at("LIKELY")) return "adult";
  if (at(s.racy) >= at("LIKELY")) return "racy";
  if (at(s.violence) >= at("VERY_LIKELY")) return "violence";
  return null;
}

/** Asks Vision about an image. Throws if Google can't be reached (the caller refuses the upload). */
export async function checkImage(image: Buffer): Promise<SafeSearch> {
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) throw new Error("GOOGLE_VISION_API_KEY is missing. Add it to .env.local.");
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ image: { content: image.toString("base64") }, features: [{ type: "SAFE_SEARCH_DETECTION" }] }] }),
    signal: AbortSignal.timeout(15000),
  });
  // Never include the URL in errors: it contains the key.
  if (!res.ok) throw new Error(`Vision check failed: ${res.status}`);
  const json = (await res.json()) as { responses?: { safeSearchAnnotation?: SafeSearch; error?: { message?: string } }[] };
  const r = json.responses?.[0];
  if (!r?.safeSearchAnnotation) throw new Error(`Vision check failed: ${r?.error?.message ?? "no answer"}`);
  return r.safeSearchAnnotation;
}
