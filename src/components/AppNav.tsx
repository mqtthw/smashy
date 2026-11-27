"use client";

import Link from "next/link";
import { GAMECUBE_PATH } from "@/lib/gamecubeIcon";
import { isTabActive } from "@/lib/navActive";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import LanguageSwitch from "./LanguageSwitch";
import { DISCORD_INVITE } from "@/lib/contact";
import Icon from "@/components/ui/Icon";
import { ThemeButton } from "./ui/ThemeToggle";
import { useT } from "@/lib/i18n/client";
import NotificationBadge from "./social/NotificationBadge";
import MessageBadge from "./messages/MessageBadge";

// The five tabs from SPEC.md. Reels and Play are placeholders until later phases.
const tabs = [
  { href: "/", label: "nav.feed" as const, icon: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  // Discussions: in the side bar on bigger screens; on phones it's a tab at the top of the feed.
  { href: "/discuss", label: "nav.discuss" as const, icon: "M3 4h13v9H8l-5 4zm15 4h3v12l-4-3h-8v-2h9z", desktopOnly: true },
  { href: "/events", label: "nav.events" as const, icon: "M7 3v2H4v16h16V5h-3V3h-2v2H9V3zm-1 7h12v9H6z" },
  { href: "/reels", label: "nav.reels" as const, icon: "M4 4h16v16H4zm6 4v8l6-4z" },
  // GameCube-style controller (lib/gamecubeIcon.ts).
  {
    href: "/play",
    label: "nav.play" as const,
    icon: GAMECUBE_PATH,
  },
  // Messages: in the side bar on bigger screens; on phones it's the ✉️ button at the top of the feed
  // (the bottom bar keeps SPEC's five tabs).
  { href: "/new", label: "nav.new" as const, icon: "M11 21v-7.1C7.6 13.6 5 11 5 7.5V6h1.5c2.3 0 4.3 1.2 5.4 3 .8-2.9 3.4-5 6.6-5H20v1.5c0 3.8-3 6.9-6.8 7V21z", desktopOnly: true },
  // Smash history (Matthew: "the history tab"); on phones it's in Feed's More menu (round 531).
  { href: "/history", label: "history.navLink" as const, icon: "M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-2.05-4.95L14 10h7V3l-2.64 2.64A8.97 8.97 0 0 0 12 3m-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z", desktopOnly: true },
  { href: "/messages", label: "nav.messages" as const, icon: "M3 5h18v14H3zm2 2v.5l7 4.5 7-4.5V7l-7 4.5z", desktopOnly: true },
  { href: "/profile", label: "nav.profile" as const, icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9a8 8 0 0 1 16 0z" },
];

function TabList({ pathname }: { pathname: string | null }) {
  const t = useT();
  // The tapped tab lights up the moment it's tapped (round 553), not when its page has arrived. It
  // remembers which page it was tapped on, so once the address changes the real one takes over.
  const [tapped, setTapped] = useState<{ href: string; on: string | null } | null>(null);
  const shown = tapped && tapped.on === pathname ? tapped.href : pathname;
  return (
    <ul className="flex justify-around md:flex-col md:gap-1 md:px-3">
      {tabs.map((tab) => {
        const active = isTabActive(shown, tab.href);
        return (
          <li key={tab.href} className={"desktopOnly" in tab ? "hidden md:block" : undefined}>
            <Link
              href={tab.href}
              onClick={() => setTapped({ href: tab.href, on: pathname })}
              title={t(tab.label)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-xs md:justify-center md:rounded-full md:py-2 md:hover:bg-surface lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-base ${
                active ? "font-bold text-foreground" : "text-muted"
              }`}
            >
              {/* The current tab's icon sits in a glossy red bubble (round 487). */}
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  active ? "bg-[#d4231a] text-white" : ""
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={active ? "h-5 w-5 fill-current" : "h-6 w-6 fill-current"}>
                  <path d={tab.icon} fillRule="evenodd" />
                </svg>
              </span>
              <span className="md:sr-only lg:not-sr-only">{t(tab.label)}</span>
              {tab.href === "/profile" && <NotificationBadge className="absolute -mt-1 ml-5 md:ml-6 lg:static lg:ml-auto" />}
              {tab.href === "/messages" && <MessageBadge className="absolute -mt-1 ml-5 md:ml-6 lg:static lg:ml-auto" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Reading the URL can't happen at build time on pages like /events/[slug],
// so the highlighted tab streams in; until then the tabs render unhighlighted.
function ActiveTabList() {
  return <TabList pathname={usePathname()} />;
}

/** `accounts`: other saved accounts for one-tap switching (server-rendered, round 701; empty when none). */
export default function AppNav({ accounts }: { accounts?: React.ReactNode }) {
  const t = useT();
  // Phones: the floating dock's own height, as --dock-h, so full-screen pages like Reels end right
  // above it (the h-above-dock rule in globals.css). It varies with the phone's text size, so it's
  // measured instead of guessed (rounds 714–715). Only its height: where it sits is worked out in CSS,
  // which is more reliable in the iPhone app than reading positions here.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--dock-h", `${Math.ceil(nav.getBoundingClientRect().height)}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  return (
    <nav
      ref={navRef}
      aria-label={t("nav.main")}
      // Phones: a floating frosted-glass dock above the home-bar strip. Bigger screens: a side bar.
      className="fixed inset-x-3 bottom-(--dock-gap) z-10 rounded-3xl glass-bar shadow-[0_10px_26px_rgb(80_10_8/0.25)] print:hidden
                 md:sticky md:flex md:flex-col md:top-0 md:bottom-auto md:inset-x-auto md:h-screen md:w-20 md:shrink-0 md:rounded-none md:border-0 md:border-r md:border-line md:bg-transparent md:shadow-none md:backdrop-blur-none lg:w-56"
    >
      <Link href="/" aria-label={t("nav.home")} className="hidden py-6 text-center md:block lg:px-5 lg:text-left">
        <span className="inline-block text-3xl lg:hidden"><Logo markOnly className="" /></span>
        <span className="hidden text-4xl lg:inline-block"><Logo className="" /></span>
      </Link>
      <Suspense fallback={<TabList pathname={null} />}>
        <ActiveTabList />
      </Suspense>
      <div className="hidden md:mt-auto md:flex md:flex-col">
        {/* The Smashy Discord (round 812), for everyone: a new member had to ask whether there was one. */}
        <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" title={t("people.profile.discord")} className="flex items-center justify-center gap-2 p-3 text-sm font-semibold text-muted hover:text-foreground lg:justify-start lg:px-5 lg:py-2">
          <Icon name="chat" className="text-lg" />
          <span className="md:max-lg:sr-only">{t("people.profile.discord")} ↗︎</span>
        </a>
        {accounts}
        {/* In the narrow icon sidebar (tablets) only the globe shows; the language list sits invisibly over it. */}
        {/* Language and light/dark together (round 773), for everyone: no account needed for either. */}
        <div className="md:mb-4 md:flex md:flex-col md:items-center lg:mb-0 lg:flex-row lg:justify-between lg:px-5 lg:pb-4 lg:pt-4">
          <LanguageSwitch
            className="md:relative md:justify-center md:p-3 lg:justify-start lg:p-0"
            selectClassName="md:max-lg:absolute md:max-lg:inset-0 md:max-lg:max-w-none md:max-lg:opacity-0"
          />
          {/* The menu skin is one dark look, so the Light/Dark button hides under it (round 932). */}
          <ThemeButton className="skin-old md:p-3 lg:p-0" labelClassName="md:max-lg:sr-only" />
        </div>
      </div>
    </nav>
  );
}
