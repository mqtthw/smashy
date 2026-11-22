"use client";
// The visitor's language in the browser. The page's <html lang> is set before anything shows (a
// small script in the layout reads the saved choice, or the browser's language on a first visit), and
// components follow it. Parts rendered per visit pass the server's answer down with <LangProvider>,
// so they show the right language from the first paint; elsewhere (the menu), the first paint is
// English and switches straight away.
//
// Only English is built in. Spanish, Japanese and French are separate files fetched when someone
// uses them (round 514): all four together were 1 MB of script on every page.
import { createContext, use, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LANG, isLang, LANG_COOKIE, phrase, setFullEnglish, setMissingPhraseHandler, type Dict, type Lang, type MessageKey, type Values } from "./base";
// The browser's English is trimmed to the phrases browser code shows (round 565, see en.client.ts).
import { en } from "@/lib/i18n/en";

const EVENT = "smashy-lang";
const LangContext = createContext<Lang | null>(null);

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

// The languages fetched so far, and the fetches under way (one each, so React sees the same promise).
const loaded: Partial<Record<Lang, Dict>> = { en };
const loading: Partial<Record<Lang, Promise<void>>> = {};
const importDict = (lang: Lang): Promise<Dict> =>
  lang === "es" ? import("./es").then((m) => m.es)
  : lang === "ja" ? import("./ja").then((m) => m.ja)
  : lang === "fr" ? import("./fr").then((m) => m.fr)
  : Promise.resolve(en);

// A phrase the trimmed English lacks (a key the scan in tests/unit/enClient.test.ts didn't see): fetch
// the full English once and redraw. Until then the phrase's key shows for a moment.
let fullEnglish: Promise<void> | null = null;
if (typeof window !== "undefined") {
  setMissingPhraseHandler((key) => {
    console.warn("Phrase not in the browser's English, fetching all of it:", key);
    fullEnglish ??= import("./enFull").then(
      (m) => {
        setFullEnglish(m.en);
        loaded.en = m.en;
        window.dispatchEvent(new Event(EVENT));
      },
      () => {},
    );
  });
}

/** Fetch a language's phrases (once). Components using it show it when it arrives. */
export function loadLang(lang: Lang): Promise<void> {
  if (loaded[lang]) return Promise.resolve();
  // A failed fetch (offline) settles anyway: English shows instead of the page waiting forever.
  return (loading[lang] ??= importDict(lang).then(
    (dict) => {
      loaded[lang] = dict;
      if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
    },
    () => {},
  ));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}
// The saved choice first: when a page fails, React draws the whole document again and <html lang>
// goes back to the layout's "en", which left the error pages in English for everyone.
const COOKIE = new RegExp(`(?:^|; )${LANG_COOKIE}=([a-z]{2})(?:;|$)`);
const fromDocument = (): Lang => {
  const saved = COOKIE.exec(document.cookie)?.[1];
  if (isLang(saved)) return saved;
  const l = document.documentElement.lang;
  return isLang(l) ? l : DEFAULT_LANG;
};

// Start fetching the visitor's language as soon as this file runs in the browser, alongside the page.
if (typeof document !== "undefined") void loadLang(fromDocument());

export function useLang(): Lang {
  const fromServer = useContext(LangContext);
  return useSyncExternalStore(subscribe, fromDocument, () => fromServer ?? DEFAULT_LANG);
}

/** A phrase in a language whose phrases may not have arrived yet (English until they do). */
export function translateNow(lang: Lang, key: MessageKey, values?: Values): string {
  if (!loaded[lang]) void loadLang(lang);
  return phrase(loaded[lang] ?? en, key, values);
}

export function useT(): (key: MessageKey, values?: Values) => string {
  const fromServer = useContext(LangContext);
  const lang = useLang();
  // The phrases themselves (not just "loaded or not"), so swapping in the full English redraws.
  const current = useSyncExternalStore(subscribe, () => loaded[lang], () => loaded[lang]);
  if (!current) {
    // Drawn on the server in this language: wait for its phrases, so the page matches what was sent.
    if (fromServer === lang) use(loadLang(lang));
    // Elsewhere English shows until they arrive (the layout started fetching them already).
    else void loadLang(lang);
  }
  const dict = current ?? loaded.en ?? en;
  return useCallback((key: MessageKey, values?: Values) => phrase(dict, key, values), [dict]);
}

/** A phrase in the visitor's language, for pages built ahead of time (server parts that can't read the cookie). */
export function T({ k, values }: { k: MessageKey; values?: Values }) {
  return <>{useT()(k, values)}</>;
}

/**
 * Switch language: remembered on this device for a year. The new language's phrases are fetched
 * first, so nothing flashes. Call router.refresh() after, for the server-made parts.
 */
export async function setLang(lang: Lang): Promise<void> {
  await loadLang(lang);
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event(EVENT));
}
