// Seasons on other pages: a player's ranks ("#3 of 24 in SA Melee Fall 2026") and the seasons an event
// counts toward. Both show nothing when there's nothing to show.
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";
import { standingRowId } from "@/lib/seasonsMath";
import { currentSeasonsIn, seasonRanksFor, seasonsCounting, seasonsToAdd } from "@/lib/seasons";
import { addSeasonEvent } from "@/app/seasons/actions";
import GameBadge from "@/components/GameBadge";
import { memberId } from "@/lib/viewer";

/** Where this player is ranked (keys: their Smashy member key and/or start.gg player key). */
/** `empty`: a line to show when they're ranked nowhere (the Seasons page, which has its own heading, so no hidden title there). */
export async function SeasonRanks({ keys, viewerId, className = "", empty }: { keys: string[]; viewerId: string | null; className?: string; empty?: string }) {
  const ranks = await seasonRanksFor(keys, await memberId(viewerId)).catch(() => []); // a login with no profile reads as a guest
  if (!ranks.length) return empty ? <p className={`text-sm text-muted ${className}`}>{empty}</p> : null;
  const t = await getT();
  return (
    <p className={`flex flex-wrap items-center gap-1.5 text-sm ${className}`}>
      {!empty && <span className="sr-only">{t("season.ranks.title")}</span>}
      {ranks.map((r) => (
        <Link key={r.seasonId} href={`/seasons/${r.seasonId}#${standingRowId(r.rowKey)}`} className="badge flex items-center gap-1 border border-line font-normal hover:bg-surface">
          <Icon name="trophy" /> {t("season.ranks.line", { rank: r.rank, players: r.players, season: r.name })}
          {!r.current && <span className="text-muted"> · {t("season.ranks.ended")}</span>}
        </Link>
      ))}
    </p>
  );
}

/** "Counts toward <season>." for an event (a Smashy bracket id, or a start.gg tournament's event ids). */
export async function SeasonsCounting({ source, refs, className = "" }: { source: "smashy" | "startgg"; refs: string[]; className?: string }) {
  const seasons = await seasonsCounting(source, refs).catch(() => []);
  if (!seasons.length) return null;
  const t = await getT();
  const [before, after] = t("season.countsToward", { seasons: "\u0001" }).split("\u0001");
  return (
    <p className={`text-sm ${className}`}>
      <Icon name="trophy" /> {before}
      {seasons.map((s, i) => (
        <span key={s.id}>
          {i > 0 && ", "}
          <Link href={`/seasons/${s.id}`} className="link">{s.name}</Link>
        </span>
      ))}
      {after}
    </p>
  );
}

/** "Rankings in Texas: …" under a region's events: its public seasons running now. Nothing when there are none. */
export async function RegionSeasons({ region, label, className = "" }: { region: string; label: string; className?: string }) {
  const seasons = await currentSeasonsIn(region).catch(() => []);
  if (!seasons.length) return null;
  const t = await getT();
  return (
    <p className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <span className="text-muted"><Icon name="trophy" /> {t("season.inRegion", { region: label })}</span>
      {seasons.map((s) => (
        <Link key={s.id} href={`/seasons/${s.id}`} className="badge flex items-center gap-1 border border-line font-normal hover:bg-surface">
          <GameBadge game={s.game} /> {s.name}
        </Link>
      ))}
    </p>
  );
}

/** On a finished bracket's page, for the people running it: "Add to <season>" for each season of theirs it fits. */
export async function AddToSeasons({ event, userId }: { event: Parameters<typeof seasonsToAdd>[0]; userId: string | null }) {
  const seasons = await seasonsToAdd(event, userId).catch(() => []);
  if (!seasons.length) return null;
  const t = await getT();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {seasons.map((s) => (
        <form key={s.id} action={addSeasonEvent}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="hosted" value={event.id} />
          <button className="btn btn-sm btn-outline"><Icon name="trophy" /> {t("season.addTo", { season: s.name })}</button>
        </form>
      ))}
    </div>
  );
}
