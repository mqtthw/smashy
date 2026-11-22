"use client";
// Highlights the standings row a link points at (/seasons/<id>#p-…). The browser's own :target
// highlight doesn't fire when the page is opened from a link inside Smashy, so this marks it instead.
import { useEffect } from "react";

export default function LinkedRow() {
  useEffect(() => {
    const mark = () => {
      document.querySelectorAll("[data-linked]").forEach((el) => el.removeAttribute("data-linked"));
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id.startsWith("p-")) return;
      const row = document.getElementById(id);
      if (!row) return;
      row.setAttribute("data-linked", "");
      row.scrollIntoView({ block: "center" });
    };
    mark();
    window.addEventListener("hashchange", mark);
    return () => window.removeEventListener("hashchange", mark);
  }, []);
  return null;
}
