"use client";

import { inFrame } from "@/lib/embed";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

// Keys, then what they do. "g h" is shown as "g then h" (in the reader's language).
const SHORTCUTS: [string, MessageKey][] = [
  ["n", "ui.keys.post"],
  ["/", "ui.keys.search"],
  ["j / k", "ui.keys.nextPrev"],
  ["g h", "ui.keys.feed"],
  ["g e", "ui.keys.events"],
  ["g r", "ui.keys.reels"],
  ["g m", "ui.keys.messages"],
  ["g n", "ui.keys.notifications"],
  ["?", "ui.keys.help"],
];

/** Keyboard shortcuts for desktop (never while you're typing in a box). Press ? for the list. */
export default function KeyboardShortcuts() {
  const t = useT();
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const pendingG = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (help && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [help]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || inFrame()) return; // no shortcuts inside another website (the bracket embed)
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (document.querySelector("dialog[open]") && e.key !== "?") return;

      if (Date.now() - pendingG.current < 1200) {
        pendingG.current = 0;
        const to = { h: "/", e: "/events", r: "/reels", m: "/messages", n: "/notifications" }[e.key];
        if (to) {
          e.preventDefault();
          router.push(to);
        }
        return;
      }
      if (e.key === "g") {
        pendingG.current = Date.now();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
      } else if (e.key === "n") {
        const box = document.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
        e.preventDefault();
        if (box) {
          box.focus();
          box.scrollIntoView({ block: "center" });
        } else router.push("/");
      } else if (e.key === "/") {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('input[type="search"], input[name="q"]');
        if (search) search.focus();
        else router.push("/search");
      } else if (e.key === "j" || e.key === "k") {
        const posts = [...document.querySelectorAll<HTMLElement>("main article")];
        if (!posts.length) return;
        e.preventDefault();
        const current = posts.findIndex((p) => p.getBoundingClientRect().top >= 60);
        const at = current === -1 ? posts.length - 1 : current;
        const next = posts[Math.max(0, Math.min(posts.length - 1, e.key === "j" ? (posts[at].getBoundingClientRect().top < 80 ? at + 1 : at) : at - 1))];
        next.scrollIntoView({ behavior: "smooth", block: "start" });
        if (!next.hasAttribute("tabindex")) next.setAttribute("tabindex", "-1");
        next.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!help) return null;
  return (
    <dialog
      ref={dialog}
      onClose={() => setHelp(false)}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      aria-label={t("ui.keys.title")}
      className="m-auto w-80 max-w-[90vw] rounded-2xl border border-line bg-background p-5 text-foreground backdrop:bg-black/50"
    >
      <h2 className="mb-3 text-lg font-bold">{t("ui.keys.title")}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {SHORTCUTS.map(([k, label]) => (
          <div key={k} className="contents">
            <dt><kbd className="rounded border border-line bg-surface px-1.5 font-mono text-xs">{k.startsWith("g ") ? k.replace(" ", ` ${t("ui.keys.then")} `) : k}</kbd></dt>
            <dd>{t(label)}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={() => dialog.current?.close()} className="btn btn-sm btn-outline mt-4">{t("common.close")}</button>
    </dialog>
  );
}
