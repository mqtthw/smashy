// The visitor's language on the server: their choice (a cookie set by the language switch, or on their
// first visit from their browser's language), else their browser's Accept-Language. Reading it makes
// the part of the page that uses it render per visit, so use it inside parts that already do (the
// ones that read who's signed in). Server-only.
import "server-only";
import { cookies, headers } from "next/headers";
import { isLang, LANG_COOKIE, pickLang, translate, type Lang, type MessageKey, type Values } from "./core";

export async function getLang(): Promise<Lang> {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(chosen)) return chosen;
  return pickLang((await headers()).get("accept-language"));
}

/** A translate function for the visitor's language. */
export async function getT(): Promise<(key: MessageKey, values?: Values) => string> {
  const lang = await getLang();
  return (key, values) => translate(lang, key, values);
}
