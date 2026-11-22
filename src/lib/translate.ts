// Translating posts and clip titles with Google Cloud Translation (server-only; the key stays here).
// Free for the first 500,000 characters a month, then about $20 per million. Results are kept in memory
// for a while, so the same text isn't paid for twice in a row.
import "server-only";
import { cacheLife } from "next/cache";

const key = () => process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
// When Google refuses the key (Translation not switched on for it, or billing), stop asking for an hour
// instead of failing on every tap, and hide the Translate buttons meanwhile.
let refusedUntil = 0;
export const hasTranslateKey = () => Boolean(key()) && Date.now() >= refusedUntil;

export const MAX_TRANSLATE_CHARS = 1000;
export { targetLanguage } from "./looksForeign";

type Result = { text: string; from: string | null };
const cache = new Map<string, Result>();

/** Translates text into `target`. Null if translation isn't set up or Google couldn't do it. */
export async function translateText(text: string, target: string): Promise<Result | null> {
  const k = key();
  const q = text.slice(0, MAX_TRANSLATE_CHARS).trim();
  if (!k || !q || Date.now() < refusedUntil) return null;
  const id = `${target}|${q}`;
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(k)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, target, format: "text" }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (Date.now() >= refusedUntil) console.error("Translation refused by Google (is the Cloud Translation API enabled for this key?)", res.status);
        refusedUntil = Date.now() + 3600_000;
        return null;
      }
      console.error("Translation failed", res.status);
      return null;
    }
    const json = (await res.json()) as { data?: { translations?: { translatedText: string; detectedSourceLanguage?: string }[] } };
    const t = json.data?.translations?.[0];
    if (!t) return null;
    const out = { text: t.translatedText, from: t.detectedSourceLanguage ?? null };
    if (cache.size > 2000) cache.clear();
    cache.set(id, out);
    return out;
  } catch (e) {
    console.error("Translation failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * The same, kept in the shared cache for a few days: when many people translate the same popular post,
 * Google is asked once. Failures aren't kept (the next tap tries again).
 */
export async function translateShared(text: string, target: string): Promise<Result | null> {
  try {
    return await cachedTranslation(text.slice(0, MAX_TRANSLATE_CHARS).trim(), target);
  } catch {
    return null;
  }
}

async function cachedTranslation(text: string, target: string): Promise<Result> {
  "use cache: remote";
  cacheLife({ stale: 3600, revalidate: 3 * 86400, expire: 7 * 86400 });
  const res = await translateText(text, target);
  if (!res) throw new Error("not translated"); // not cached
  return res;
}
