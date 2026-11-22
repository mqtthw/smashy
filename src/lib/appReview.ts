"use client";
// Asking for a store rating inside the app (round 643, Matthew: "Yes, add it"). The App Store and Google
// Play rank apps with more and better ratings higher, and both let an app show their own rating sheet
// (@capawesome/capacitor-app-review in apps/mobile, from version 1.0.1). The store decides whether the
// sheet really shows (Apple: at most 3 times a year), so Smashy only asks at a good moment:
// - right after something went well (a post went up, "I'm going" to an event),
// - from the person's third day using the app,
// - at most once every 120 days.
// On the website, and in app versions without the plugin, it does nothing.

const DAYS_KEY = "smashy-app-days"; // distinct days the app was used (up to MIN_DAYS)
const LAST_DAY_KEY = "smashy-app-last-day";
const ASKED_KEY = "smashy-review-asked"; // when it last asked (ms)
const MIN_DAYS = 3;
const EVERY_MS = 120 * 86400e3;

type ReviewPlugin = { requestReview: () => Promise<void> };
type Cap = { isNativePlatform?: () => boolean; Plugins?: { AppReview?: ReviewPlugin } };

const plugin = (): ReviewPlugin | null => {
  if (typeof window === "undefined") return null;
  const cap = (window as Window & { Capacitor?: Cap }).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins?.AppReview ?? null : null;
};

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

/** Whether now is a good time to ask, from the days used and when it last asked. */
export function shouldAskForReview(daysUsed: number, lastAsked: number, now: number): boolean {
  return daysUsed >= MIN_DAYS && now - lastAsked >= EVERY_MS;
}

/** Counts today as a day the app was used (call once per page load in the app). */
export function countAppDay(now = Date.now()) {
  if (!plugin()) return;
  const today = new Date(now).toISOString().slice(0, 10);
  if (read(LAST_DAY_KEY) === today) return;
  write(LAST_DAY_KEY, today);
  write(DAYS_KEY, String(Math.min(MIN_DAYS, (Number(read(DAYS_KEY)) || 0) + 1)));
}

/** Something just went well: maybe show the store's rating sheet, a moment later. */
export function askForReviewAfterWin() {
  const review = plugin();
  if (!review) return;
  countAppDay();
  const now = Date.now();
  if (!shouldAskForReview(Number(read(DAYS_KEY)) || 0, Number(read(ASKED_KEY)) || 0, now)) return;
  write(ASKED_KEY, String(now));
  setTimeout(() => void review.requestReview().catch(() => {}), 1500);
}
