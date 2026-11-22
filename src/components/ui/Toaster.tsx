"use client";

// A small notice at the bottom of the screen ("You're doing that too fast…"), for quick actions
// like likes and follows that update instantly and then find out the server said no.
// Screen readers announce it too. Mounted once in the root layout.
import { useEffect, useState } from "react";
import { translateNow, useT } from "@/lib/i18n/client";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/base";

type Toast = { id: number; text: string };
const listeners = new Set<(t: Toast) => void>();
let nextId = 1;

export function showToast(text: string) {
  const t = { id: nextId++, text };
  listeners.forEach((fn) => fn(t));
}

export const OFFLINE_MESSAGE = "Couldn't reach Smashy. Check your connection and try again.";

/** The offline notice in the page's language (runAction isn't a component, so it reads <html lang>). */
function offlineMessage() {
  const lang = typeof document === "undefined" ? DEFAULT_LANG : document.documentElement.lang;
  return translateNow(isLang(lang) ? lang : DEFAULT_LANG, "common.offline");
}

/**
 * Runs a quick action and shows a notice if it fails (a returned `{ error }` or no connection).
 * Returns true when it worked. Use inside startTransition so the instant (optimistic) change
 * snaps back on failure, and the notice says why.
 */
export async function runAction(action: () => Promise<{ error?: string } | void>): Promise<boolean> {
  try {
    const res = await action();
    if (res && res.error) {
      showToast(res.error);
      return false;
    }
    return true;
  } catch (e) {
    // A redirect (e.g. to sign in) is how Next.js navigates from an action: let it through.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    showToast(offlineMessage());
    return false;
  }
}

export default function Toaster() {
  const t = useT();
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const onToast = (t: Toast) => setToast(t);
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-6"
    >
      {toast && (
        <div key={toast.id} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg">
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label={t("ui.dismiss")} className="font-bold opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
