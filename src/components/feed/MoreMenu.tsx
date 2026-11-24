"use client";
// "More" on the Feed header, phones only: a side panel like X's (Matthew, round 539), sliding in from
// the right so it never fights iOS's swipe-from-the-left-edge to go back. Opened by the ☰ button or by
// swiping left on the Feed; closed by a link, the dimmed backdrop, Escape, or swiping it back right.
// Wider screens have the side menu instead. React Activity keeps left pages alive, so it also closes
// (and stops listening for swipes) when the Feed is hidden.
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import Icon, { type IconName } from "@/components/ui/Icon";
import NotificationBadge from "@/components/social/NotificationBadge";
import MessageBadge from "@/components/messages/MessageBadge";
import { DISCORD_INVITE } from "@/lib/contact";

// Notifications and Messages first, About last, set apart (Matthew). Not preloaded (round 552): the
// panel is closed nearly every time the Feed opens, so preloading six pages each visit was waste.
// Leagues, Seasons and Smash history live on the Events tab.
const ITEMS: { href: string; label: MessageKey; icon: IconName; badge?: "notifications" | "messages" }[] = [
  { href: "/notifications", label: "setroom.notif.title", icon: "bell", badge: "notifications" },
  { href: "/messages", label: "nav.messages", icon: "mail", badge: "messages" },
  { href: "/discuss", label: "nav.discuss", icon: "chat" },
  { href: "/new", label: "nav.new", icon: "users" },
  { href: "/saved", label: "ui.more.saved", icon: "bookmark" },
];

const noop = () => () => {};
/** A swipe this far (px), mostly sideways, opens or closes the panel. */
const SWIPE = 60;

/** True when the touch began inside something that scrolls sideways (a row of cards, tabs): that swipe is theirs. */
function inSideScroller(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches("input, textarea, select, video, [contenteditable]")) return true;
    if (n.scrollWidth > n.clientWidth + 1) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
  }
  return false;
}

export default function MoreMenu({ className, profile, admin }: { className: string; profile?: ReactNode; admin?: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const onClient = useSyncExternalStore(noop, () => true, () => false);

  // Swipe left anywhere on the Feed (phones) opens it. Not from the screen's right edge, which iOS
  // keeps for "forward".
  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => {
      const p = e.touches[0];
      start = e.touches.length === 1 && p.clientX < window.innerWidth - 24 && window.matchMedia("(max-width: 767px)").matches && !inSideScroller(e.target as Element) ? { x: p.clientX, y: p.clientY } : null;
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - start.x;
      const dy = p.clientY - start.y;
      start = null;
      if (dx < -SWIPE && Math.abs(dy) < Math.abs(dx) / 2) setOpen(true);
    };
    document.addEventListener("touchstart", down, { passive: true });
    document.addEventListener("touchend", up, { passive: true });
    return () => {
      document.removeEventListener("touchstart", down);
      document.removeEventListener("touchend", up);
      setOpen(false);
    };
  }, []);

  // While open: Escape closes, Tab stays inside the panel, and the page behind doesn't scroll. On
  // close, focus goes back to the ☰ button (round 585), unless a link in the panel was followed.
  const opener = useRef<HTMLButtonElement>(null);
  const followedLink = useRef(false);
  useEffect(() => {
    if (!open) return;
    followedLink.current = false;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || !panel.current.contains(at))) {
        e.preventDefault();
        first.focus();
      }
    };
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    panel.current?.focus();
    const button = opener.current;
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", key);
      if (!followedLink.current) button?.focus({ preventScroll: true });
    };
  }, [open]);

  // Swiping the panel back to the right closes it.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  return (
    <>
      <button ref={opener} type="button" onClick={() => setOpen(true)} className={`${className} md:hidden`} aria-label={t("ui.more.title")} title={t("ui.more.title")} aria-expanded={open} aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        {/* Unread notifications or messages show on the closed button too. */}
        <NotificationBadge />
        <MessageBadge />
      </button>
      {onClient &&
        createPortal(
          <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
            <button type="button" tabIndex={-1} aria-label={t("common.close")} onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`} />
            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={t("ui.more.title")}
              tabIndex={-1}
              inert={!open}
              onClick={(e) => {
                if (!(e.target as Element).closest("a")) return;
                followedLink.current = true;
                setOpen(false);
              }}
              onTouchStart={(e) => (swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
              onTouchEnd={(e) => {
                const s = swipe.current;
                swipe.current = null;
                if (!s) return;
                const dx = e.changedTouches[0].clientX - s.x;
                if (dx > SWIPE && Math.abs(e.changedTouches[0].clientY - s.y) < dx / 2) setOpen(false);
              }}
              style={{ background: "var(--background)", paddingTop: "max(env(safe-area-inset-top), 1.25rem)", paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
              className={`absolute inset-y-0 right-0 flex w-[82%] max-w-80 flex-col overflow-y-auto border-l border-line shadow-2xl outline-none transition-transform duration-200 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
            >
              {profile && <div className="border-b border-line px-5 pb-4">{profile}</div>}
              <ul className="flex flex-col py-2">
                {ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} prefetch={false} className="flex items-center gap-4 px-5 py-3.5 text-lg font-bold hover:bg-surface">
                      <Icon name={item.icon} className="text-2xl" />
                      <span className="flex-1">{t(item.label)}</span>
                      {item.badge === "notifications" && <NotificationBadge />}
                      {item.badge === "messages" && <MessageBadge />}
                    </Link>
                  </li>
                ))}
                {/* Site admins only (round 589): renders its own <li>, or nothing for everyone else. */}
                {admin}
              </ul>
              <div className="mt-auto border-t border-line pt-2">
                {/* The Smashy Discord (round 812): a new member had to ask whether there was one. */}
                <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-5 py-3 text-base font-semibold text-muted hover:bg-surface hover:text-foreground">
                  <Icon name="chat" className="text-xl" />
                  {t("people.profile.discord")} ↗
                </a>
                <Link href="/help" prefetch={false} className="flex items-center gap-4 px-5 py-3 text-base font-semibold text-muted hover:bg-surface hover:text-foreground">
                  <Icon name="heart" className="text-xl" />
                  {t("ui.more.help")}
                </Link>
                <Link href="/about" prefetch={false} className="flex items-center gap-4 px-5 py-3 text-base font-semibold text-muted hover:bg-surface hover:text-foreground">
                  <Icon name="info" className="text-xl" />
                  {t("ui.more.about")}
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
