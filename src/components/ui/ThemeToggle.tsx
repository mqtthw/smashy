"use client";

import { useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

type Theme = "system" | "light" | "dark";
const KEY = "smashy-theme"; // also read by the script in app/layout.tsx
const OPTIONS: { value: Theme; label: MessageKey }[] = [
  { value: "system", label: "ui.theme.system" },
  { value: "light", label: "ui.theme.light" },
  { value: "dark", label: "ui.theme.dark" },
];

const listeners = new Set<() => void>();
function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}
function write(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((l) => l());
}

/** What's on screen right now: the saved choice, or the device's own setting. Null on the server. */
function shown(): "light" | "dark" {
  const saved = read();
  if (saved !== "system") return saved;
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/**
 * One small button that flips light and dark, for the sidebar next to the language menu (round 773):
 * the full choice lived only on Profile, so a first-time visitor couldn't switch. Saved on this
 * device; no account needed. `labelClassName` hides the word where there's only room for the icon.
 */
export function ThemeButton({ className = "", labelClassName = "" }: { className?: string; labelClassName?: string }) {
  const t = useT();
  const now = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const media = window.matchMedia("(prefers-color-scheme: light)");
      media.addEventListener("change", cb);
      return () => {
        listeners.delete(cb);
        media.removeEventListener("change", cb);
      };
    },
    shown,
    () => null,
  );
  return (
    <button
      type="button"
      onClick={() => write(shown() === "dark" ? "light" : "dark")}
      aria-label={`${t("ui.theme")}: ${t(now === "light" ? "ui.theme.light" : "ui.theme.dark")}`}
      title={t("ui.theme")}
      className={`flex items-center gap-1 rounded-md text-meta text-muted hover:text-foreground ${className}`}
    >
      <Icon name={now === "light" ? "sun" : "moon"} />
      <span className={labelClassName}>{now === null ? "" : t(now === "light" ? "ui.theme.light" : "ui.theme.dark")}</span>
    </button>
  );
}

/** Light / Dark / Match device. Saved on this device only. */
export default function ThemeToggle() {
  const t = useT();
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "system" as Theme,
  );

  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{t("ui.theme")}</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className="chip">
          <input type="radio" name="theme" className="sr-only" checked={theme === o.value} onChange={() => write(o.value)} />
          {t(o.label)}
        </label>
      ))}
    </fieldset>
  );
}

