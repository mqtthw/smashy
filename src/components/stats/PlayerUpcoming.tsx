// "Upcoming tournaments" on a player's page (round 797): the tournaments their start.gg account is on, still
// to come, each opening Smashy's tournament page. start.gg can't tell signing up from helping run one, so
// the note says both. Nothing is shown when there are none or start.gg can't be asked.
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { formatEventDate } from "@/lib/format";
import { getLang, getT } from "@/lib/i18n/server";
import { regionName } from "@/lib/regions";
import { getPlayerUpcoming } from "@/lib/startggPlayers";

export default async function PlayerUpcoming({ playerId, tag }: { playerId: string; tag: string }) {
  const upcoming = await getPlayerUpcoming(playerId).catch(() => []);
  if (!upcoming.length) return null;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <section aria-labelledby="player-upcoming" className="m-4 flex flex-col gap-2">
      <h2 id="player-upcoming" className="font-bold">{t("people.upcoming.title")}</h2>
      <p className="text-meta text-muted">{t("people.upcoming.note", { tag })}</p>
      <ul className="card divide-y divide-line text-sm">
        {upcoming.map((u) => (
          <li key={u.slug}>
            <Link href={`/events/${u.slug}`} className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-surface">
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold">{u.name}</span>
                {[...new Set(u.events.map((e) => e.game))].slice(0, 2).map((g) => <GameBadge key={g} game={g} />)}
              </span>
              <span className="text-meta text-muted">
                {formatEventDate(u.startAt, u.timezone, lang)}
                {" · "}
                {u.online ? t("event.online") : [u.city, u.region ? regionName(u.region) : null].filter(Boolean).join(", ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
