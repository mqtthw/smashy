"use client";

// On the embed page: a click on a link to any other page opens it in a new tab, so the frame on the
// TO's website always keeps showing the bracket. Pools and "jump to round" links stay in the frame.
import { useEffect } from "react";
import { outsideLink } from "@/lib/embed";

export default function EmbedLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const to = outsideLink(a.href, window.location.href);
      if (!to) return;
      // Caught before the app's own link handling, which would open the page inside the frame.
      e.preventDefault();
      e.stopPropagation();
      window.open(to, "_blank", "noopener");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
