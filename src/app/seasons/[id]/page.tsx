// A season's standings: the scene's own ranking, run by its admins. Each player opens to show the events
// that counted; below are the events and how points work. Teens' names only for signed-in viewers.
import LinkedRow from "./LinkedRow";
import StandingsFilter from "./StandingsFilter";
import CopyButton from "@/components/ui/CopyButton";
import { siteUrl } from "@/lib/siteMeta";
import { standingRowId, standingsText } from "@/lib/seasonsMath";
import { isSiteAdmin } from "@/lib/scenes";
import { acceptSeasonInvite, declineSeasonInvite, moderateSeason } from "../actions";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import Icon from "@/components/ui/Icon";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { placeKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";
import { regionName } from "@/lib/regions";
import { canManageSeason, getSeason, getSeasonAdmins, getSeasonEvents, getStandings, hasSeasonInvite, type ShownRow } from "@/lib/seasons";
import { ownPictureMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { memberId } from "@/lib/viewer";
import { dayLabel, dayRange } from "../parts";

export async function generateMetadata({ params }: PageProps<"/seasons/[id]">): Promise<Metadata> {
  const season = await getSeason((await params).id).catch(() => null);
  if (!season || season.removed) return { title: "Season" };
  return ownPictureMeta(season.name, `${season.name}: standings, events and how points work. A scene ranking on Smashy, run by its admins.`, season.visibility === "unlisted" ? { robots: { index: false } } : {});
}

async function SeasonView({ params }: { params: PageProps<"/seasons/[id]">["params"] }) {
  const { id } = await params;
  const season = await getSeason(id);
  if (!season) notFound();
  const [userId, t, lang] = await Promise.all([getUserId(), getT(), getLang()]);
  // A season taken down by a moderator: only moderators still see it (to restore it).
  const moderator = userId ? await isSiteAdmin(userId).catch(() => false) : false;
  if (season.removed && !moderator) notFound();
  const [admins, events, canManage, invited] = await Promise.all([getSeasonAdmins(season), getSeasonEvents(season.id), canManageSeason(season, userId), hasSeasonInvite(season.id, userId)]);
  const manage = canManage && !season.removed;
  // Teens are named only to members with a profile (a bare login counts as a guest, round 719).
  const rows = await getStandings(season, events, await memberId(userId));
  // The text to paste somewhere public is written as a signed-out visitor sees it (teens unnamed).
  // (The same rows with a visitor's hiding: no second standings run.)
  const publicRows = userId ? rows.map((r) => ({ ...r, hidden: r.hiddenFromGuests })) : rows;
  const shareText = standingsText(season.name, publicRows, `${siteUrl().origin}/seasons/${season.id}`, t("season.hiddenPlayer"), (n) => t("season.pts", { n }), 10, t("season.move.new"));
  const ranked = rows.filter((r) => r.rank !== null);
  const unranked = rows.filter((r) => r.rank === null);
  const place = (n: number) => t(placeKey(n), { n });
  // The signed-in player's own row (their account key, or an entry merged into it).
  const mine = userId ? rows.find((r) => r.keys.includes(`u:${userId}`)) : undefined;

  const playerRow = (r: ShownRow) => (
    // Each named player's row has its own address (#p-…) to link to; hidden players' rows don't (their key is an account id).
    <li key={r.key} id={r.hidden ? undefined : standingRowId(r.key)} className={`scroll-mt-20 target:bg-brand/10 data-linked:bg-brand/10 ${r === mine ? "bg-brand/10" : ""}`} data-player={(r.hidden ? t("season.hiddenPlayer") : r.name).toLowerCase()}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-surface">
          <span className="w-8 shrink-0 text-right font-bold tabular-nums">{r.rank ?? "–"}</span>
          <span className="w-8 shrink-0 text-meta tabular-nums">
            {r.movement?.kind === "up" ? <span className="text-success"><span aria-hidden="true">▲{r.movement.by}</span><span className="sr-only">{t("season.move.up", { n: r.movement.by })}</span></span>
              : r.movement?.kind === "down" ? <span className="text-danger"><span aria-hidden="true">▼{r.movement.by}</span><span className="sr-only">{t("season.move.down", { n: r.movement.by })}</span></span>
              : r.movement?.kind === "new" ? <span className="text-brand">{t("season.move.new")}</span>
              : null}
          </span>
          {/* A long tag shortens with "…", but the You badge stays in view. */}
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{r.hidden ? <span className="text-muted">{t("season.hiddenPlayer")}</span> : r.name}</span>
            {r === mine && <span className="shrink-0 rounded-full border border-brand px-1.5 py-0.5 text-meta font-semibold text-brand">{t("season.you")}</span>}
          </span>
          <span className="shrink-0 text-right tabular-nums">
            <span className="font-bold">{r.points}</span>
            <span className="block text-meta text-muted">{t("season.table.eventsShort", { n: r.events })} · {t("season.table.best", { place: place(r.best) })}</span>
          </span>
        </summary>
        <div className="flex flex-col gap-1 px-3 pb-3 pl-14 text-sm">
          {!r.hidden && r.handle && <Link href={`/u/${r.handle}`} className="link self-start text-meta">{t("season.table.profile")}</Link>}
          {!r.hidden && !r.handle && r.key.startsWith("s:") && <Link href={`/players/${r.key.slice(2)}`} className="link self-start text-meta">{t("season.table.playerPage")}</Link>}
          <ul className="flex flex-col gap-0.5">
            {r.results.map((x) => (
              <li key={x.eventId} className={`flex justify-between gap-3 ${x.counted ? "" : "text-muted line-through"}`}>
                <span className="min-w-0 truncate">{x.eventName} · {place(x.place)}</span>
                <span className="shrink-0 tabular-nums">{x.points}</span>
              </li>
            ))}
          </ul>
          {r.results.some((x) => !x.counted) && <p className="text-meta text-muted">{t("season.table.notCounted", { n: season.bestOf ?? 0 })}</p>}
        </div>
      </details>
    </li>
  );

  return (
    <>
      {season.removed && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3 text-sm">
          <span>{t("season.mod.hidden")}</span>
          <form action={moderateSeason}>
            <input type="hidden" name="id" value={season.id} />
            <input type="hidden" name="restore" value="1" />
            <button className="btn btn-sm btn-outline">{t("season.mod.restore")}</button>
          </form>
        </div>
      )}
      {invited && !season.removed && (
        // Asked to help run it (round 639): nothing changes until they accept.
        <div className="card flex flex-col gap-2 p-3 text-sm">
          <p>{t("season.invite.text", { name: `@${admins.find((a) => a.owner)?.handle ?? ""}` })}</p>
          <div className="flex gap-2">
            <form action={acceptSeasonInvite}>
              <input type="hidden" name="id" value={season.id} />
              <button className="btn btn-sm btn-primary">{t("season.invite.accept")}</button>
            </form>
            <form action={declineSeasonInvite}>
              <input type="hidden" name="id" value={season.id} />
              <button className="btn btn-sm btn-outline">{t("season.invite.decline")}</button>
            </form>
          </div>
        </div>
      )}
      <header className="flex flex-col gap-1">
        <Link href="/seasons" className="text-sm text-muted hover:underline">← {t("season.title")}</Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><GameBadge game={season.game} /> <span className="min-w-0">{season.name}</span></h1>
        <p className="text-sm text-muted">
          {dayRange(season.startsOn, season.endsOn, lang)}
          {season.region ? ` · ${regionName(season.region)}` : ""}
        </p>
        <p className="text-sm">
          {t("season.runBy", { names: admins.map((a) => `@${a.handle}`).join(", ") })}
        </p>
        <p className="text-meta text-muted">{t("season.scenesOwn")}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {manage && <Link href={`/seasons/${season.id}/manage`} className="btn btn-sm btn-primary">{t("season.manage")}</Link>}
          {rows.length > 0 && <a href={`/seasons/${season.id}/standings.csv`} className="btn btn-sm btn-outline"><Icon name="chart" /> {t("season.csv")}</a>}
          {publicRows.some((r) => r.rank !== null) && <CopyButton text={shareText} label={t("season.copyText")} />}
        </div>
      </header>

      <section aria-labelledby="standings" className="flex flex-col gap-2">
        <h2 id="standings" className="font-bold">{t("season.standings")}</h2>
        <LinkedRow />
        {mine && (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand/10 p-3 text-sm">
            <span>
              {mine.rank !== null
                ? t("season.youRanked", { rank: mine.rank, points: t("season.pts", { n: mine.points }), events: t("season.events", { n: mine.events }) })
                : t("season.youUnranked", { events: t("season.events", { n: mine.events }), need: season.minEvents })}
            </span>
            {rows.length > 10 && <a href={`#${standingRowId(mine.key)}`} className="link font-semibold">{t("season.youJump")}</a>}
          </p>
        )}
        {rows.length === 0 ? (
          <p className="card p-4 text-sm text-muted">{manage ? t("season.emptyAdmin") : t("season.empty")}</p>
        ) : (
          <div id="standings-list" className="flex flex-col gap-2">
            {rows.length > 15 && <StandingsFilter target="standings-list" label={t("season.findPlayer")} none={t("season.findNone")} />}
            {ranked.length > 0 && <ol className="card divide-y divide-line">{ranked.map(playerRow)}</ol>}
            {unranked.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-muted">{t("season.unranked", { n: season.minEvents })}</h3>
                <ul className="card divide-y divide-line">{unranked.map(playerRow)}</ul>
              </>
            )}
          </div>
        )}
      </section>

      {events.length > 0 && (
        <section aria-labelledby="season-events" className="flex flex-col gap-2">
          <h2 id="season-events" className="font-bold">{t("season.events", { n: events.length })}</h2>
          <ul className="card divide-y divide-line text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  {e.source === "smashy" ? <Link href={`/host/${e.ref}`} className="block truncate font-semibold hover:underline">{e.name}</Link> : <span className="block truncate font-semibold">{e.name}</span>}
                  <span className="text-meta text-muted">
                    {dayLabel(e.heldOn, lang)} · {t("season.entrants", { n: e.entrants ?? e.results.length })} · {e.source === "smashy" ? "Smashy" : "start.gg"}
                  </span>
                </span>
                {e.weight !== 1 && <span className="badge shrink-0 bg-surface">×{e.weight}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="how-points" className="flex flex-col gap-2">
        <h2 id="how-points" className="font-bold">{t("season.howPoints")}</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm sm:grid-cols-3">
          {season.points.map(([from, pts], i) => {
            const next = season.points[i + 1]?.[0];
            const label = next && next - 1 > from ? `${place(from)}–${place(next - 1)}` : next ? place(from) : t("season.andBelow", { place: place(from) });
            return (
              <li key={from} className="flex justify-between gap-2">
                <span className="text-muted">{label}</span>
                <span className="tabular-nums">{pts}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">
          {season.bestOf ? t("season.rule.bestOf", { n: season.bestOf }) : t("season.rule.all")}{" "}
          {season.minEvents > 1 ? t("season.rule.min", { n: season.minEvents }) : ""}{" "}
          {t("season.rule.weight")}
        </p>
      </section>

      {moderator && !season.removed && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">{t("season.mod.takeDown")}</summary>
          <form action={moderateSeason} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="id" value={season.id} />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="confirm" value="1" required />
              <span>{t("season.mod.confirm")}</span>
            </label>
            <button className="btn btn-sm btn-outline self-start text-danger">{t("season.mod.takeDown")}</button>
          </form>
        </details>
      )}
    </>
  );
}

export default function SeasonPage(props: PageProps<"/seasons/[id]">) {
  return (
    <section className="flex flex-col gap-5 p-4">
      <Suspense fallback={<CardListSkeleton count={5} />}>
        <SeasonView params={props.params} />
      </Suspense>
    </section>
  );
}
