// Smashy in more than one language: which languages there are, and filling in a phrase. Only English is
// built in here, so browser code can use this without downloading every language (round 514: all four
// were 1 MB of script on every page). The server's translate, with all four, is in core.ts; the browser
// loads the visitor's own language on demand (client.tsx).
// In the browser this is the trimmed English (en.client.ts, round 565): only the phrases browser code
// shows. next.config.ts swaps the file for browser builds; the server always gets all of them.
import { en, type MessageKey } from "@/lib/i18n/en";

export const LANGS = ["en", "es", "ja", "fr"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "lang";
export const LANG_NAMES: Record<Lang, string> = { en: "English", es: "Español", ja: "日本語", fr: "Français" };

/** The locale for dates and numbers in a Smashy language. */
export const LOCALES: Record<Lang, string> = { en: "en-US", es: "es-MX", ja: "ja-JP", fr: "fr-FR" };
export const localeFor = (lang: string | null | undefined): string => (isLang(lang) ? LOCALES[lang] : LOCALES.en);

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** The language to use for an Accept-Language header or a browser's language list (any country's Spanish, Japanese or French counts). */
export function pickLang(preferred: string | readonly string[] | null | undefined): Lang {
  const list = typeof preferred === "string" ? preferred.split(",").map((p) => p.split(";")[0]) : (preferred ?? []);
  for (const raw of list) {
    const code = raw.trim().toLowerCase().slice(0, 2);
    if (code === "en") return "en";
    if (code === "es") return "es";
    if (code === "ja") return "ja";
    if (code === "fr") return "fr";
  }
  return DEFAULT_LANG;
}

export type Values = Record<string, string | number>;
export type Dict = Record<MessageKey, string>;

/**
 * A phrase from a language's phrases (English when it's missing), with {name} filled in. A phrase can
 * have a plural form after "|" ("1 event|{n} events"): the first is used when n is 1.
 */
let fullEnglish: Partial<Dict> | null = null;
let onMissing: ((key: string) => void) | null = null;
/** The browser's hook for a phrase its trimmed English lacks (client.tsx fetches the full English). */
export function setMissingPhraseHandler(fn: (key: string) => void) {
  onMissing = fn;
}
/** The full English, once the browser has fetched it. */
export function setFullEnglish(dict: Partial<Dict>) {
  fullEnglish = dict;
}

export function phrase(dict: Partial<Dict>, key: MessageKey, values?: Values): string {
  const found = dict[key] ?? fullEnglish?.[key] ?? en[key];
  if (found === undefined) onMissing?.(key);
  let text: string = found ?? key;
  if (text.includes("|") && values && typeof values.n === "number") {
    const [one, many] = text.split("|");
    text = values.n === 1 ? one : many;
  }
  return values ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in values ? String(values[name]) : m)) : text;
}

/** A phrase in English (for code that has no visitor, or before their language has loaded). */
export const english = (key: MessageKey, values?: Values): string => phrase(en, key, values);

export type { MessageKey };

/** A place as people write it in a language: "3rd", "3.º", "3位", "3e" (1er). For phrases that take {place}. */
export function placeIn(lang: Lang, n: number): string {
  if (lang === "fr") return n === 1 ? "1er" : `${n}e`;
  if (lang === "en") {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
    return `${n}${suffix}`;
  }
  return String(n);
}

/** The phrase for a place: "event.place.first" for 1, then st/nd/rd/th by the English ending (11th–13th are "th"). */
export function placeKey(n: number): MessageKey {
  if (n === 1) return "event.place.first";
  const r = n % 100;
  if (r >= 11 && r <= 13) return "event.place.th";
  return ({ 1: "event.place.st", 2: "event.place.nd", 3: "event.place.rd" } as Record<number, MessageKey>)[n % 10] ?? "event.place.th";
}
