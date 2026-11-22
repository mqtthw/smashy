"use client";

// Puts a short prefix in front of the browser tab's title ("(2) Weekly #4 · Smashy", "⚔️ Your set is up · …"),
// so it's visible from a background tab. Next.js rewrites the title after load and on navigation, so a
// MutationObserver puts the prefix back when it does. No prefix (null) leaves the title alone.
import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

const PREFIX = /^(\(\d+\) |⚔️ [^·]{1,40} · )/; // any language's "⚔️ … ·"

export default function TitlePrefix({ prefix: given, k }: { prefix?: string | null; k?: MessageKey }) {
  const t = useT();
  const prefix = k ? t(k) : (given ?? null);
  useEffect(() => {
    const strip = (t: string) => t.replace(PREFIX, "");
    const apply = () => {
      const want = prefix ? `${prefix} ${strip(document.title)}` : strip(document.title);
      if (document.title !== want) document.title = want;
    };
    apply();
    const el = document.querySelector("title");
    const watch = el ? new MutationObserver(apply) : null;
    if (el) watch!.observe(el, { childList: true, characterData: true, subtree: true });
    return () => {
      watch?.disconnect();
      document.title = strip(document.title);
    };
  }, [prefix]);
  return null;
}
