"use client";

import { useSyncExternalStore } from "react";
import { useLang } from "./i18n/client";
import { localeFor } from "./i18n/base";

const noop = () => () => {};
/** Shown while a page is built on the server (it can't know the reader's time zone); fixed right after it loads. */
export const SERVER_TZ = "America/Chicago";
export const SERVER_LOCALE = "en-US";

/** The reader's own time zone, from their device (e.g. "Asia/Tokyo"). */
export function useViewerTimeZone(): string {
  return useSyncExternalStore(
    noop,
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || SERVER_TZ;
      } catch {
        return SERVER_TZ;
      }
    },
    () => SERVER_TZ,
  );
}

/**
 * The locale for dates: the browser's own (e.g. "en-GB" writes 7 Nov and 21:30) when it's in the language
 * picked on Smashy, else that picked language's (someone who chose Spanish in an English browser gets
 * Spanish dates, matching the rest of the page).
 */
export function useViewerLocale(): string {
  const lang = useLang();
  const browser = useSyncExternalStore(noop, () => navigator.language || SERVER_LOCALE, () => SERVER_LOCALE);
  return pickDateLocale(browser, lang);
}

/** `browser` if it's in `lang`, else `lang`'s own locale. */
export function pickDateLocale(browser: string, lang: string): string {
  if (browser.toLowerCase().split("-")[0] !== lang) return localeFor(lang);
  // Some systems report a tag dates can't use, like "en-US@posix" (round 578: it threw on the Feed).
  try {
    return Intl.getCanonicalLocales(browser)[0] ?? localeFor(lang);
  } catch {
    return localeFor(lang);
  }
}
