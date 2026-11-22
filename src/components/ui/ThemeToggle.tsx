"use client";

import { useSyncExternalStore } from "react";
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

