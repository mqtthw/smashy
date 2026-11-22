// The language of people Smashy sends something to (an alert, a phone push), from their profile; English
// for members who haven't chosen or signed in since languages were added. Server-only.
import "server-only";
import { createAdminClient } from "../supabase/admin";
import { isLang, LANGS, translate, type Lang, type MessageKey, type Values } from "./core";

export type Tr = (key: MessageKey, values?: Values) => string;
export const trFor = (lang: Lang): Tr => (key, values) => translate(lang, key, values);

/** Each person's language (missing people: English). */
export async function langsFor(userIds: string[]): Promise<Map<string, Lang>> {
  const out = new Map<string, Lang>();
  const ids = [...new Set(userIds)].filter(Boolean);
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await createAdminClient().from("profiles").select("id, lang").in("id", ids.slice(i, i + 200));
    for (const r of (data ?? []) as { id: string; lang: string | null }[]) if (isLang(r.lang)) out.set(r.id, r.lang);
  }
  return out;
}

/** A translate function for each recipient: `(userId) => t`. */
export async function translatorsFor(userIds: string[]): Promise<(userId: string) => Tr> {
  const langs = await langsFor(userIds);
  return (userId) => trFor(langs.get(userId) ?? "en");
}

/**
 * An alert's sentence in every language with each {name} as "%": for "was this already sent?" checks,
 * which have to find it whatever language it was written in. As a PostgREST `or` filter on event_name.
 */
export function sentInAnyLanguage(key: MessageKey): string {
  return LANGS.map((lang) => {
    const pattern = `${translate(lang, key).replace(/\{\w+\}/g, "%").replace(/"/g, '\\"')}%`; // and anything added after it
    return `event_name.like."${pattern}"`;
  }).join(",");
}
