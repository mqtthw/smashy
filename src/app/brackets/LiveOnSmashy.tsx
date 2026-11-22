import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { getUpcomingHostedEvents } from "@/lib/hostedEvents";
import { getUserId } from "@/lib/supabase/server";
import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";

/** Brackets running on Smashy right now (each links straight to its live bracket). Nothing when none are. */
export default async function LiveOnSmashy() {
  const [userId, t] = await Promise.all([getUserId(), getT()]);
  const events = (await getUpcomingHostedEvents({ limit: 60, viewerId: userId }).catch(() => [])).filter((e) => e.status === "in_progress");
  if (!events.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="live-on-smashy">
      <h2 id="live-on-smashy" className="font-bold"><span className="text-brand">●</span> {t("browse.brackets.liveOnSmashy")}</h2>
      <ul className="card divide-y divide-line">
        {events.slice(0, 10).map((e) => (
          <li key={e.id}>
            <Link href={`/host/${e.id}/bracket`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
              <GameBadge game={e.game} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.name}</span>
                <span className="block text-meta text-muted">
                  <Icon name={e.online ? "globe" : "pin"} /> {e.online ? t("event.online") : (e.location ?? t("event.inPerson"))} · {t("browse.players", { n: e.entrantCount })}
                </span>
              </span>
              <span className="shrink-0 text-meta font-semibold text-brand">{t("browse.watchArrow")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
