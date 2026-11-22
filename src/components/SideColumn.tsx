"use client";

// The right-hand column on wide screens (round 500): Live now near you, coming up, and the next
// majors, in glass panels. Phones and tablets never load it: it asks /api/side only once the screen
// is wide enough to show it.
import Link from "next/link";
import { useEffect, useState } from "react";
import GameBadge from "@/components/GameBadge";
import { dateBadgeParts } from "@/lib/format";
import { useLang, useT } from "@/lib/i18n/client";
import type { SideData, SideEvent } from "@/lib/sideColumn";

const WIDE = "(min-width: 1280px)";

function EventRow({ e, live, lang }: { e: SideEvent; live: boolean; lang: string }) {
  const d = dateBadgeParts(e.startAt, e.timezone, lang);
  return (
    <li>
      <Link href={`/events/${e.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface">
        <span className={`date-bubble ${live ? "date-bubble-live" : ""}`} aria-hidden="true">
          <span className={`text-[0.625rem] font-bold ${live ? "" : "text-brand"}`}>{d.month}</span>
          <span className="text-lg font-bold">{d.day}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{e.name}</span>
          {e.city && <span className="block truncate text-meta text-muted">{e.city}</span>}
        </span>
      </Link>
    </li>
  );
}

export default function SideColumn() {
  const t = useT();
  const lang = useLang();
  const [data, setData] = useState<SideData | null>(null);

  useEffect(() => {
    const media = window.matchMedia(WIDE);
    let loaded = false;
    const load = () => {
      if (loaded || !media.matches) return;
      loaded = true;
      fetch("/api/side")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: SideData | null) => d && setData(d))
        .catch(() => {});
    };
    load();
    media.addEventListener("change", load);
    return () => media.removeEventListener("change", load);
  }, []);

  if (!data) return null;
  const events = [...data.live.map((e) => ({ e, live: true })), ...data.next.map((e) => ({ e, live: false }))];

  return (
    <aside aria-label={t("ui.guest.comingUp", { region: data.regionName })} className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col gap-4 overflow-y-auto p-4 print:hidden xl:flex">
      {events.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 font-bold">{t("ui.guest.comingUp", { region: data.regionName })}</h2>
          <ul className="card flex flex-col divide-y divide-line overflow-hidden">
            {events.map(({ e, live }) => <EventRow key={e.slug} e={e} live={live} lang={lang} />)}
          </ul>
        </section>
      )}
      {data.majors.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-bold">{t("ui.guest.majors")}</h2>
            <Link href="/events" className="text-meta font-semibold text-brand">{t("ui.guest.allEvents")}</Link>
          </div>
          <ul className="card flex flex-col divide-y divide-line overflow-hidden">
            {data.majors.map((m) => {
              const d = dateBadgeParts(Date.parse(m.startAt) / 1000, m.timezone, lang);
              return (
                <li key={m.slug}>
                  <Link href={`/events/${m.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface">
                    <span className={`date-bubble ${m.live ? "date-bubble-live" : ""}`} aria-hidden="true">
                      <span className={`text-[0.625rem] font-bold ${m.live ? "" : "text-brand"}`}>{d.month}</span>
                      <span className="text-lg font-bold">{d.day}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1">
                        {m.games.slice(0, 2).map((g) => <GameBadge key={g} game={g} />)}
                        {m.entrants ? <span className="text-meta text-muted">{t("browse.entrants", { n: m.entrants })}</span> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );
}
