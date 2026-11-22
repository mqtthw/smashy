// Whether this page is running inside Smashy's App Store or Google Play app (apps/mobile: a Capacitor
// shell around smashy.gg). The shell adds window.Capacitor to every page it shows.
export function inNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

/** The page part of a smashy.gg link (null for anything else), so the app never leaves Smashy. */
export function smashyPath(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !["smashy.gg", "www.smashy.gg"].includes(u.hostname)) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}
