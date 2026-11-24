// "Players you follow" on Events (round 797): each player a member follows, with their next tournament on
// start.gg (soonest first), or that nothing is coming up. Follow anyone from their player page. Only the
// first FOLLOWS_SHOWN are looked up (one start.gg request each, kept in the shared cache for hours).
import Link from "next/link";
import { formatEventDate } from "@/lib/format";
import { getLang, getT } from "@/lib/i18n/server";
import { FOLLOWS_SHOWN, getPlayerFollows } from "@/lib/playerFollows";
import { playersHidingStats } from "@/lib/playerStats";
import { regionName } from "@/lib/regions";
import { getPlayerUpcoming, type UpcomingTournament } from "@/lib/startggPlayers";
import { getUserId } from "@/lib/supabase/server";

export default async function FollowedPlayers() {
  const userId = await getUserId();
  const all = await getPlayerFollows(userId).catch(() => []);
  if (!all.length) return null;
  // Someone who has since asked not to be listed, or hidden their stats, drops out of the list.
  const hidden = await playersHidingStats(all.map((f) => f.playerId)).catch(() => null);
  if (!hidden) return null;
  const follows = all.filter((f) => !hidden.has(f.playerId)).slice(0, FOLLOWS_SHOWN);
  const [t, lang, upcoming] = await Promise.all([
    getT(),
    getLang(),
    Promise.all(follows.map((f) => getPlayerUpcoming(f.playerId).catch((): UpcomingTournament[] | null => null))),
  ]);
  const rows = follows
    .map((f, i) => ({ ...f, next: upcoming[i]?.[0] ?? null, failed: upcoming[i] === null }))
    .sort((a, b) => (a.next?.startAt ?? Infinity) - (b.next?.startAt ?? Infinity));
  return (
    <section aria-labelledby="followed-players" className="flex flex-col gap-2 px-4 pt-4">
      <h2 id="followed-players" className="font-bold">{t("browse.followed.title")}</h2>
      <ul className="card divide-y divide-line text-sm">
        {rows.map((r) => (
          <li key={r.playerId} className="flex flex-col gap-0.5 px-4 py-2.5">
            <Link href={`/players/${r.playerId}`} className="font-semibold hover:underline">{r.tag}</Link>
            {r.next ? (
              <Link href={`/events/${r.next.slug}`} className="text-meta text-muted hover:underline">
                {r.next.name} · {formatEventDate(r.next.startAt, r.next.timezone, lang)}
                {" · "}
                {r.next.online ? t("event.online") : [r.next.city, r.next.region ? regionName(r.next.region) : null].filter(Boolean).join(", ")}
              </Link>
            ) : (
              <span className="text-meta text-muted">{r.failed ? t("browse.followed.cantCheck") : t("browse.followed.nothing")}</span>
            )}
          </li>
        ))}
      </ul>
      {all.length > follows.length && <p className="text-meta text-muted">{t("browse.followed.more", { n: follows.length })}</p>}
    </section>
  );
}
