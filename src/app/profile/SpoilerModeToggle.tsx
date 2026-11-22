"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";

const KEY = "smashy-spoiler-mode";
const ATTR = "data-spoiler-mode";

function apply(on: boolean) {
  if (on) document.documentElement.setAttribute(ATTR, "");
  else document.documentElement.removeAttribute(ATTR);
}

function subscribe(cb: () => void) {
  // Another tab flipped the switch: follow it here too.
  const sync = (e: StorageEvent) => {
    if (e.key === KEY) apply(e.newValue === "1");
  };
  window.addEventListener("storage", sync);
  window.addEventListener("storage", cb);
  window.addEventListener("smashy:spoiler-toggle", cb);
  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener("storage", cb);
    window.removeEventListener("smashy:spoiler-toggle", cb);
  };
}
const read = () => {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Spoiler mode: hide placements and set scores until tapped (this browser only). */
export default function SpoilerModeToggle() {
  const t = useT();
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = (next: boolean) => {
    try {
      if (next) window.localStorage.setItem(KEY, "1");
      else window.localStorage.removeItem(KEY);
    } catch {}
    apply(next);
    window.dispatchEvent(new Event("smashy:spoiler-toggle"));
  };
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-semibold">{t("people.spoiler.title")}</span>
        <span className="block text-meta text-muted">{t("people.spoiler.body")}</span>
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} className="h-5 w-5" />
    </label>
  );
}
