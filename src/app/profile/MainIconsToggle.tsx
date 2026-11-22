"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";

const KEY = "smashy-hide-mains";

function subscribe(cb: () => void) {
  // Another tab flipped the switch: show or hide the icons here too.
  const sync = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    if (e.newValue === "1") document.documentElement.setAttribute("data-hide-mains", "");
    else document.documentElement.removeAttribute("data-hide-mains");
  };
  window.addEventListener("storage", sync);
  window.addEventListener("storage", cb);
  window.addEventListener("smashy:mains-toggle", cb);
  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener("storage", cb);
    window.removeEventListener("smashy:mains-toggle", cb);
  };
}
const read = () => {
  try {
    return window.localStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
};

/** Show or hide the little main icons next to everyone's names (this browser only). */
export default function MainIconsToggle() {
  const t = useT();
  const on = useSyncExternalStore(subscribe, read, () => true);
  const set = (next: boolean) => {
    try {
      if (next) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, "1");
    } catch {}
    if (next) document.documentElement.removeAttribute("data-hide-mains");
    else document.documentElement.setAttribute("data-hide-mains", "");
    window.dispatchEvent(new Event("smashy:mains-toggle"));
  };
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-semibold">{t("people.mainIcons.title")}</span>
        <span className="block text-meta text-muted">{t("people.mainIcons.body")}</span>
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} className="h-5 w-5" />
    </label>
  );
}
