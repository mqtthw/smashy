import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Fragment, Suspense, type ReactNode } from "react";
import BracketView from "@/components/brackets/BracketView";
import GroupPicker from "@/components/brackets/GroupPicker";
import Podium from "@/components/brackets/Podium";
import ShareButton from "@/components/ui/ShareButton";
import Icon from "@/components/ui/Icon";
import { bracketSearchName, getMyStartggEvents } from "@/lib/myStartgg";
import { getUserId } from "@/lib/supabase/server";
import { formatEventDate, formatEventTime, unixNow } from "@/lib/format";
import { RememberBracket } from "@/components/brackets/RecentBrackets";
import { bracketStandings, podiumLine } from "@/lib/brackets/podium";
import { siteUrl } from "@/lib/siteMeta";
import GameBadge from "@/components/GameBadge";
import { LiveDot } from "@/components/majors/MajorParts";
import { getBracket, getEventPodium, isSource } from "@/lib/brackets";
import { getStartggTop8 } from "@/lib/brackets/startgg";
import { bracketPath, SOURCE_NAMES } from "@/lib/brackets/types";
import { topCutGroupId } from "@/lib/brackets/phases";
import { BracketSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";

/**
 * A phrase with {placeholders} filled by React nodes (a bold time, a link): pass MARK (or MARK2 for a
 * second one) as their values, then the nodes in the same order.
 */
const MARK = "\u0001";
const MARK2 = "\u0002";
function withNode(text: string, ...nodes: ReactNode[]) {
  return <>{text.split(/([\u0001\u0002])/).map((part, i) => (part === MARK ? <Fragment key={i}>{nodes[0]}</Fragment> : part === MARK2 ? <Fragment key={i}>{nodes[1]}</Fragment> : part))}</>;
}


/**
 * A finished bracket's results picture. start.gg's standings cover the whole event; without them the
 * picture is worked out from this bracket, so it names the group (the final bracket).
 */
function top8Picture(source: string, bracket: { event: { eventId: string }; groupId: string }, standings: boolean): string {
  const base = `/brackets/${source}/${encodeURIComponent(bracket.event.eventId)}/top8.png`;
  return standings ? base : `${base}?group=${encodeURIComponent(bracket.groupId)}`;
}

async function load(props: PageProps<"/brackets/[source]/[eventId]">) {
  const [{ source, eventId }, sp] = await Promise.all([props.params, props.searchParams]);
  const query = typeof sp.q === "string" ? sp.q.slice(0, 40) : "";
  if (!isSource(source)) notFound();
  const group = typeof sp.group === "string" ? sp.group : null;
  const bracket = await getBracket(source, decodeURIComponent(eventId), group).catch((e) => {
    // Next.js stopping a background page build isn't a real failure; don't log it as one.
    if ((e as { digest?: string })?.digest !== "HANGING_PROMISE_REJECTION") console.error("Bracket load failed", e);
    return undefined;
  });
  return { source, bracket, query };
}

export async function generateMetadata(props: PageProps<"/brackets/[source]/[eventId]">): Promise<Metadata> {
  const { source, bracket } = await load(props);
  if (!bracket) return { title: "Bracket" };
  // Finished brackets say who won in link previews (Discord, iMessage, search results).
  const top = await getEventPodium(source, bracket);
  const description = top ? podiumLine(top) : `Fast bracket view for ${bracket.event.tournamentName}.`;
  // The preview picture: a finished start.gg event's Top 8 (round 356), otherwise the site's own.
  // Setting openGraph here replaces the layout's, so the site picture has to be named again.
  // Named with this bracket's group: if start.gg's standings turn out not to be there, the picture
  // falls back to this same bracket (the route ignores the group when it has the standings).
  const picture = top && bracket.finished ? top8Picture(source, bracket, false) : null;
  const image = picture
    ? { url: new URL(picture, siteUrl()).toString(), width: 1200, height: 630, alt: `${bracket.event.tournamentName}: Top 8` }
    : { url: new URL("/opengraph-image", siteUrl()).toString(), width: 1200, height: 630, alt: "Smashy" };
  return {
    title: `${bracket.event.eventName} bracket · ${bracket.event.tournamentName}`,
    description,
    openGraph: { description, images: [image] },
    twitter: { card: "summary_large_image", images: [image.url] },
  };
}

async function BracketContent(props: PageProps<"/brackets/[source]/[eventId]">) {
  const { source, bracket, query } = await load(props);
  if (bracket === null) notFound();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  if (!bracket) {
    return <p className="p-6 text-muted">{t("browse.bracket.loadFailed", { source: SOURCE_NAMES[source] })}</p>;
  }
  const e = bracket.event;
  const [top, myEvents, top8] = await Promise.all([
    getEventPodium(source, bracket),
    // Players in this event (start.gg linked) get "My sets": their own path through the bracket.
    source === "startgg" ? getUserId().then(getMyStartggEvents) : Promise.resolve([]),
    // A finished start.gg event's Top 8, for "Copy results" (the same cached request as its picture).
    source === "startgg" && bracket.finished ? getStartggTop8(e.eventId).catch(() => null) : Promise.resolve(null),
  ]);
  const mine = myEvents.find((m) => m.eventId === e.eventId);
  const myName = mine ? bracketSearchName(mine.myName) : null;
  // Following their path: when none of their sets are in this pool, "My sets" opens the pool of their latest set.
  const myGroups = mine ? mine.sets.map((x) => x.groupId).filter((g): g is string => !!g) : [];
  const myGroup = myGroups.includes(bracket.groupId) ? null : (myGroups.at(-1) ?? null);
  // "Top 8" opens the top cut pool when it's a different one (Pools → Top 8).
  const topCut = topCutGroupId(e.groups);
  // A bracket that hasn't started says when it does ("Starts Mon · 7 PM" / "waiting for the organizer").
  const notStarted = !bracket.live && !bracket.finished && !bracket.rounds.some((r) => r.sets.some((x) => x.state !== "pending"));
  if (notStarted) await connection(); // compares with the current time
  const now = notStarted ? unixNow() : 0;
  // This pool's start: its own time, or the event's for the first phase (start.gg); parry.gg gives the event's.
  const poolStart = bracket.poolStartAt !== undefined ? bracket.poolStartAt : (e.startAt ?? null);
  // The tournament is past its end time and this pool still has no scores: reported late (The Contract #225).
  const resultsPending = notStarted && !!e.endAt && now > e.endAt;
  const site = SOURCE_NAMES[source];
  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {bracket.live && <LiveDot />}
          {e.game && <GameBadge game={e.game} />}
          <span className="text-meta text-muted">{t("browse.bracket.via", { source: site })}</span>
        </div>
        <div>
          <h1 className="text-title font-bold">{e.eventName}</h1>
          {e.tournamentSlug ? (
            <Link href={`/events/${e.tournamentSlug}`} className="text-muted hover:underline">{e.tournamentName}</Link>
          ) : (
            <p className="text-muted">{e.tournamentName}</p>
          )}
        </div>
        <GroupPicker source={source} eventId={e.eventId} groups={e.groups} current={bracket.groupId} mine={myGroups} />
        <div className="flex flex-wrap items-center gap-3">
          <ShareButton path={`/brackets/${source}/${encodeURIComponent(e.eventId)}`} title={`${e.tournamentName} · ${e.eventName} bracket`} label={t("browse.bracket.share")} className="btn btn-sm btn-ghost" />
          <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="link text-meta">{t("browse.openOn", { source: site })}<NewTab /></a>
        </div>
      </header>
      {notStarted && (resultsPending || poolStart || e.groups.length > 1) && (
        <p className="mx-4 mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          ⏳ {resultsPending
            ? t("browse.bracket.pending", { source: site })
            : poolStart && poolStart > now
              ? withNode(t("browse.bracket.starts", { when: MARK }), <b>{formatEventDate(poolStart, e.timezone ?? null, lang)} · {formatEventTime(poolStart, e.timezone ?? null, lang)}</b>)
              : poolStart
                ? withNode(t(now - poolStart > 2 * 3600 ? "browse.bracket.scheduledLate" : "browse.bracket.scheduled", { time: MARK }), <b>{formatEventTime(poolStart, e.timezone ?? null, lang)}</b>)
                : t("browse.bracket.fillsIn")}
        </p>
      )}
      <RememberBracket path={`/brackets/${source}/${encodeURIComponent(e.eventId)}`} title={`${e.tournamentName}`} sub={`${e.eventName} · ${SOURCE_NAMES[source]}`} />
      {top && (
        <Podium
          podium={top}
          name={`${e.tournamentName} · ${e.eventName}`}
          url={new URL(`/brackets/${source}/${encodeURIComponent(e.eventId)}`, siteUrl()).toString()}
          words={{ title: (n) => t("event.copy.title", { event: n }), full: (u) => t("event.copy.full", { url: u }) }}
          standings={top8?.standings.map((s) => ({ place: s.placement, tag: s.tag, prefix: s.prefix })) ?? bracketStandings(bracket)?.map((r) => ({ place: r.place, tag: r.player.name, prefix: r.player.prefix }))}
        />
      )}
      {top && bracket.finished && (top8 || bracketStandings(bracket)) && (
        <p className="mx-4 mb-3 text-sm text-muted">
          <Icon name="image" /> {t("event.graphic.label")}{" "}
          <a href={`${top8Picture(source, bracket, !!top8)}${lang === "en" ? "" : `${top8 ? "?" : "&"}lang=${lang}`}`} target="_blank" rel="noopener" className="link">{t("event.graphic.link")}<NewTab /></a>
        </p>
      )}
      {bracket.rounds.length ? (
        <BracketView
          key={bracket.groupId}
          bracket={bracket}
          initialQuery={query}
          myName={myName}
          myHref={myGroup ? bracketPath(source, e.eventId, myGroup) : null}
          top8Href={topCut && topCut !== bracket.groupId ? bracketPath(source, e.eventId, topCut) : null}
        />
      ) : (
        <p className="border-t border-line p-6 text-muted">{t("browse.bracket.notSeeded")}</p>
      )}
    </LangProvider>
  );
}

export default function BracketPage(props: PageProps<"/brackets/[source]/[eventId]">) {
  return (
    <section>
      <div className="px-4 pt-4">
        <Link href="/brackets" className="text-meta text-muted hover:text-foreground"><T k="browse.brackets.back" /></Link>
      </div>
      <Suspense fallback={<BracketSkeleton />}>
        <BracketContent {...props} />
      </Suspense>
    </section>
  );
}
