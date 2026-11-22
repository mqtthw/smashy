// Smashy's phrases in every language, for the server (pages, emails, alerts, images). The phrases
// themselves are in en.ts, es.ts, ja.ts and fr.ts (each must have every English phrase: TypeScript
// checks it). Browser code must use base.ts and client.tsx instead: importing this file from a
// "use client" file sends all four languages to every visitor (a unit test checks).
import { en } from "./en";
import { es } from "./es";
import { ja } from "./ja";
import { fr } from "./fr";
import { phrase, type Dict, type Lang, type MessageKey, type Values } from "./base";

export * from "./base";

const DICTS: Record<Lang, Dict> = { en, es, ja, fr };

/**
 * A phrase in a language, with {name} filled in. A phrase can have a plural form after "|"
 * ("1 event|{n} events"): the first is used when n is 1.
 */
export function translate(lang: Lang, key: MessageKey, values?: Values): string {
  return phrase(DICTS[lang], key, values);
}
