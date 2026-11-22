"use server";

import { headers } from "next/headers";
import { MAX_TRANSLATE_CHARS, hasTranslateKey, targetLanguage, translateShared } from "@/lib/translate";
import { overLimit } from "@/lib/limits";
import { getReel } from "@/lib/reels";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

// A simple per-address limit, so the button can't be used to run up the translation bill.
const recent = new Map<string, number[]>();
const PER_HOUR = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What can be translated: a post (its title and text) or a clip's title. Only things on Smashy, not any text. */
export type TranslateSource = { kind: "post"; id: string } | { kind: "reel"; id: string };

async function sourceText(source: TranslateSource): Promise<string | null> {
  if (source?.kind === "post" && UUID.test(source.id)) {
    // The reader's own access: a post they can't see (removed, private account) can't be translated.
    const { data } = await (await createClient()).from("posts").select("title, body, removed_at").eq("id", source.id).maybeSingle();
    if (!data || data.removed_at) return null;
    return data.title ? `${data.title}\n\n${data.body ?? ""}` : (data.body ?? null);
  }
  if (source?.kind === "reel" && typeof source.id === "string" && source.id.length > 0 && source.id.length <= 200) {
    const reel = await getReel(source.id).catch(() => null);
    return reel?.title ?? null;
  }
  return null;
}

/** Translate a post or clip title into the reader's language (signed-in members only, to keep costs safe). */
export async function translate(source: TranslateSource, readerLang: string): Promise<{ text?: string; from?: string | null; same?: boolean; error?: string; signIn?: boolean }> {
  const t = await getT();
  if (!hasTranslateKey()) return { error: t("ui.translate.unavailable") };
  const userId = await getVerifiedUserId();
  if (!userId) return { signIn: true, error: t("ui.translate.signIn") };
  const text = await sourceText(source);
  const clean = String(text ?? "").slice(0, MAX_TRANSLATE_CHARS);
  if (!clean.trim()) return { error: t("ui.translate.nothing") };
  const h = await headers();
  const who = userId || (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const times = (recent.get(who) ?? []).filter((x) => now - x < 3600_000);
  if (times.length >= PER_HOUR) return { error: t("ui.translate.tooMany") };
  recent.set(who, [...times, now]);
  if (recent.size > 5000) recent.clear();
  // The list above only knows about this one server. The database keeps the real count.
  const tooMany = await overLimit("translate");
  if (tooMany) return { error: tooMany };
  const target = targetLanguage(readerLang);
  const res = await translateShared(clean, target);
  if (!res) return { error: t("ui.translate.failed") };
  if (res.from && res.from.split("-")[0] === target) return { same: true }; // already in the reader's language
  return { text: res.text, from: res.from };
}
