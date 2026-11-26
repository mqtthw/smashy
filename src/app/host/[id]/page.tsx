import type { Metadata } from "next";
import { AddToSeasons, SeasonsCounting } from "@/components/seasons/SeasonParts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import GameBadge from "@/components/GameBadge";
import LinkifiedText from "@/components/feed/LinkifiedText";
import EntrantActions from "@/components/host/EntrantActions";
import HostPanel from "@/components/host/HostPanel";
import StartggImport from "@/components/host/StartggImport";
import Icon from "@/components/ui/Icon";
import { MedalCounts } from "@/components/ui/PlaceMark";
import LiveDot from "@/components/ui/LiveDot";
import { scoreLine } from "@/lib/brackets/score";
import BracketControls from "@/components/host/BracketControls";
import SwissRound from "@/components/host/SwissRound";
import FinalBracketStart from "@/components/host/FinalBracketStart";
import CopyOverlayLink from "@/components/host/CopyOverlayLink";
import BracketLive from "@/components/host/BracketLive";
import HostAnnounce from "@/components/host/HostAnnounce";
import StartsIn from "@/components/host/StartsIn";
import HostLocalTime from "@/components/host/HostLocalTime";
import CopyResults from "@/components/host/CopyResults";
import ChallongeCopy from "@/components/host/ChallongeCopy";
import { prRows } from "@/lib/prNames";
import NudgeButton from "@/components/host/NudgeButton";
import StationInput from "@/components/host/StationInput";
import ConnectCodeForm from "@/components/host/ConnectCodeForm";
import MySetButton from "@/components/host/MySetButton";
import NextUpCard from "@/components/host/NextUpCard";
import OutNote from "@/components/host/OutNote";
import { ConfirmAllAgreed, PendingInTitle, QuickConfirm } from "@/components/host/FinalScoreReport";
import { finalsAgree, nextFreeSetup, type LiveState } from "@/lib/liveSet";
import { isStreamSetup, pickStreamSet } from "@/lib/streamSet";
import { currentSetFor, firstPartDone, isElimination, knockedOut, swissProgress, swissTotalRounds } from "@/lib/bracketEngine";
import { feederStatus, type FeederStatus } from "@/lib/feederStatus";
import PostEventButton from "@/components/host/PostEventButton";
import OnNow from "@/components/host/OnNow";
import { finalPlacements } from "@/lib/hostedPromotion";
import { resultsText, winnersLine } from "@/lib/resultsText";
import { eventRules } from "@/lib/hostedRules";
import { bracketPreview } from "@/lib/bracketPreview";
import { eventJsonLd } from "@/lib/eventSchema";
import PostCard from "@/components/feed/PostCard";
import { getHostedEventPosts } from "@/lib/posts";
import Results from "@/components/host/Results";
import EventShareActions from "@/components/host/EventShareActions";
import { bracketPlayers, bracketResults, connectCodeFor, latestResults, liveGameScores, loadEngineSets, openSets, setStations, toBracket, type OpenSet } from "@/lib/hostedBracket";
import LiveReportButton from "@/components/play/LiveReportButton";
import Avatar from "@/components/ui/Avatar";
import LocalTime from "@/components/ui/LocalTime";
import ShareButton from "@/components/ui/ShareButton";
import EmbedCode from "@/components/host/EmbedCode";
import { embedSnippet } from "@/lib/embed";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { unixNow } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { checkInOpensAt, FORMAT_LABEL, getCohosts, getEventBrackets, getHostedEntrants, getHostedEvent, getHostedRecords, getMyEntries, getPlacementsFrom, getSeriesEditions, getSeriesMedals, formatSummary } from "@/lib/hostedEvents";
import EventBrackets from "@/components/host/EventBrackets";
import TeamActions from "@/components/host/TeamActions";
import PaidList from "@/components/host/PaidList";
import DiscordCard from "@/components/host/DiscordCard";
import { getDiscordStatus } from "@/lib/discord";
import { NoShowDq } from "@/components/host/NoShowButtons";
import { noShowStatus, setStarted } from "@/lib/setups";
import { getPaidEntries, getWaitlist } from "@/lib/hostedExtras";
import { waitlistNames, waitlistPosition } from "@/lib/waitlist";
import { entryIdFor } from "@/lib/hostedTeams";
import BringPlayers from "@/components/host/BringPlayers";
import { defaultCut, MAX_EXTRA_BRACKETS } from "@/lib/eventBrackets";
import Cohosts from "@/components/host/Cohosts";
import { clip, ownPictureMeta, siteUrl } from "@/lib/siteMeta";
import { createClient, getUserId } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessageKey } from "@/lib/i18n/core";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";

// One read per page view (round 732): the page's title and the page itself ask for the same data, and
// Smashy's time-limited database calls aren't de-duplicated by Next, so each used to run twice.
const eventOnce = cache((id: string) => getHostedEvent(id));
const setsOnce = cache((eventId: string) => loadEngineSets(eventId));

export async function generateMetadata({ params }: PageProps<"/host/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = await eventOnce(id).catch(() => null);
  if (!e || e.removed) return { title: "Event not found" };
  const where = e.online ? `Online${e.region ? ` · ${e.region}` : ""}` : (e.location ?? "In person");
  // Finished events say who won in link previews and search results.
  if (e.status === "completed") {
    const [sets, entrants] = await Promise.all([setsOnce(e.id), getHostedEntrants(e.id)]).catch(() => [[], []] as const);
    const tags = new Map(entrants.map((x) => [x.userId, x.tag]));
    const line = winnersLine(finalPlacements([...sets]), (pid) => tags.get(pid) ?? null);
    // Tools that read brackets can find the results file from the page itself.
    if (line) return ownPictureMeta(e.name, clip(`${line} · ${GAMES[e.game].short} on Smashy`, 200), { alternates: { types: { "application/json": `/host/${e.id}/results.json` } } });
  }
  return ownPictureMeta(e.name, clip(`${GAMES[e.game].short} ${formatSummary(e).toLowerCase()} on Smashy · ${where}. ${e.description ?? "Sign up on Smashy."}`, 200));
}

const STATUS_KEY: Record<string, MessageKey> = {
  open: "event.status.open",
  closed: "event.status.closed",
  in_progress: "event.status.inProgress",
  completed: "event.status.completed",
  canceled: "event.status.canceled",
};

async function Event({ params }: { params: PageProps<"/host/[id]">["params"] }) {
  const { id } = await params;
  const [event, userId, t, lang] = await Promise.all([eventOnce(id), getUserId(), getT(), getLang()]);
  if (!event) notFound();
  // Co-TOs are set on the main event and run its extra brackets too.
  const doubles = event.teamSize === 2; // the entries are teams of two
  const [entrants, sets, editions, cohosts, brackets, myId, waitlist] = await Promise.all([
    getHostedEntrants(event.id, { teams: doubles }),
    setsOnce(event.id),
    getSeriesEditions(event),
    getCohosts(event.parentId ?? event.id),
    getEventBrackets(event).catch(() => []),
    // The id I play under in this bracket: my own in singles, my team's in doubles.
    entryIdFor(event, userId).catch(() => null),
    // The line for a full event (singles, before the bracket starts).
    !doubles && ["open", "closed"].includes(event.status) ? getWaitlist(event.id).catch(() => []) : Promise.resolve([]),
  ]);
  const myWait = waitlistPosition(waitlist, userId);
  const waitingNames = waitlistNames(waitlist);
  // More than one bracket in this event (a Redemption bracket, a second game): each page lists them all.
  const severalBrackets = brackets.length > 1;
  const mainId = event.parentId ?? event.id;
  const bracketStarted = sets.length > 0;
  const social = event.format === "social"; // a get-together (round 757): sign-ups, no bracket
  const finished = event.status === "completed";
  const results = finished ? bracketResults(event, sets) : null;
  // Pools or Swiss with a final bracket that hasn't been started: is the first part finished? (For "Start the final bracket".)
  const finalWaiting = event.finalFormat && bracketStarted && !sets.some(isElimination) ? { ready: firstPartDone(sets, event.swissRounds) } : null;
  // Swiss: where the current round stands (for the host's "Start round N").
  const swiss = (() => {
    if (event.format !== "swiss" || !bracketStarted) return null;
    const { round } = swissProgress(sets);
    const current = sets.filter((s) => s.bracket === "SW" && s.round === round);
    return {
      round,
      rounds: swissTotalRounds(sets, event.swissRounds),
      open: current.filter((s) => s.state === "ready" || s.state === "live").length,
      untouched: round > 1 && current.every((s) => s.state === "ready" || s.state === "bye"),
    };
  })();
  // The host, or a co-TO helping run it (everything but editing, canceling and managing co-TOs).
  const isMainHost = !!userId && userId === event.hostId;
  const isHost = isMainHost || cohosts.some((c) => c.userId === userId);
  const me = myId ? entrants.find((x) => x.userId === myId) : undefined;
  const nowMs = unixNow() * 1000;
  const startMs = Date.parse(event.startsAt);
  const started = nowMs >= startMs;
  const opens = checkInOpensAt(event);
  // An extra bracket takes sign-ups until the host closes them or starts it (they're often made on the day).
  const canJoin = event.status === "open" && (!started || !!event.parentId) && !event.removed;
  // Check-in stays open until the host starts the bracket (hosts often start a few minutes late).
  const beforeBracket = ["open", "closed"].includes(event.status) && !bracketStarted;
  const checkInOpen = event.checkinMinutes > 0 && opens !== null && nowMs >= opens && beforeBracket;
  const checkedInCount = entrants.filter((x) => x.checkedIn).length;
  const notCheckedIn = event.checkinMinutes > 0 ? entrants.filter((x) => !x.checkedIn) : [];
  // Players: their set that's being called now. Host: every set that's ready or being played.
  const mySet = myId ? currentSetFor(sets, myId) : undefined;
  const tagOf = new Map(entrants.map((x) => [x.userId, x.tag]));
  // Did I already report my set's final score? Then I'm waiting on the TO, not on my opponent.
  // (From the page's one read of the open sets, round 767.)
  const myLive: Pick<LiveState, "finals" | "station"> | null = mySet
    ? await openSets(event.id)
        .then((open) => open.find((s) => s.id === mySet.key)?.live ?? null)
        .catch(() => null)
    : null;
  const myReported = !!(mySet && myLive?.finals?.[mySet.p[0].id === myId ? "1" : "2"]);
  const myStation = myLive?.station ?? null;
  // Who to look for at the venue (or add online).
  const myOpponent = mySet ? (tagOf.get((mySet.p[0].id === myId ? mySet.p[1].id : mySet.p[0].id) ?? "") ?? t("event.yourOpponent")) : null;
  const completedIds = editions.filter((ed) => ed.status === "completed").map((ed) => ed.id);
  // A later edition of this series that's taking sign-ups ("Next up: Weekly #4").
  const nextEdition = editions.find((ed) => ed.id !== event.id && ed.status === "open" && ed.startsAt > event.startsAt && Date.parse(ed.startsAt) > nowMs);
  const completedEditions = completedIds.length;
  // Between sets: your next set is decided on one side but waiting for the other ("vs Winner of B").
  const pending = myId && !mySet && event.status === "in_progress" ? sets.find((s) => s.state === "waiting" && (s.p[0].id === myId || s.p[1].id === myId)) : undefined;

  // Everything else this page might need, loaded at the same time (each only when it's shown).
  const loadRunning = async () => {
    if (!isHost || event.status !== "in_progress") return [];
    const supabase = await createClient();
    type Row = OpenSet;
    // Every open set, however many (a big round robin has hundreds at once). This used to keep only
    // the 60 least recently updated, which dropped exactly the sets players had just reported.
    // The same one read the rest of the page uses (round 767).
    const live = await openSets(event.id);
    // Recent "Help needed" calls to this TO, for any set (matched to the open sets below).
    const { data: calls } = live.length
      ? await supabase.from("notifications").select("event_href").eq("user_id", userId!).eq("type", "event_update").like("event_name", "Help needed:%").like("event_href", "/host/set/%").gt("created_at", new Date(nowMs - 30 * 60_000).toISOString())
      : { data: [] };
    const helpWanted = new Set(((calls ?? []) as { event_href: string }[]).map((c) => c.event_href));
    // Online events: which players (with accounts; walk-ins can't add one) haven't added a connect code.
    let hasCode: Set<string> | null = null;
    if (event.online && live.length) {
      const { data: codes } = await createAdminClient().from("hosted_connect_codes").select("user_id").eq("event_id", event.id);
      hasCode = new Set(((codes ?? []) as { user_id: string }[]).map((c) => c.user_id));
    }
    const guests = new Set(entrants.filter((x) => x.guest).map((x) => x.userId));
    const missingCode = (ids: (string | null)[]) =>
      hasCode ? ids.filter((id): id is string => !!id && !guests.has(id) && !hasCode!.has(id)).map((id) => tagOf.get(id) ?? t("event.player")) : [];
    // Sets with a player-reported result waiting for the TO come first.
    // Waiting time counts from when the set was called, so assigning a setup or a report doesn't reset it.
    const since = (s: Row) => Date.parse((s.state === "ready" ? s.live?.calledAt : null) ?? s.updated_at);
    const rows = live.map((s) => ({ ...s, reported: Object.keys(s.live?.finals ?? {}).length > 0, since: since(s) }));
    rows.sort((a, b) => Number(b.reported) - Number(a.reported) || a.since - b.since || (a.identifier ?? "").localeCompare(b.identifier ?? "", undefined, { numeric: true }));
    // The no-show clock (if the event has one): from when the set got its place to play, until
    // both players say they're here or anything happens in its room.
    const clockFor = (s: Row) => {
      const clock = noShowStatus({
        minutes: event.noShowMinutes,
        since: s.live?.stationAt ? Date.parse(s.live.stationAt) : event.setups ? null : since(s),
        now: nowMs,
        started: s.state === "live" || setStarted(s.live),
        here: s.live?.here,
      });
      return clock ? { overdue: clock.overdue, left: clock.deadline - nowMs, missing: clock.missing } : null;
    };
    return rows.map((s) => ({
      reported: s.reported,
      finals: s.live?.finals ?? {},
      station: s.live?.station ?? null,
      id: s.id,
      identifier: s.identifier,
      p1: tagOf.get(s.p1_id ?? "") ?? t("event.player"),
      p2: tagOf.get(s.p2_id ?? "") ?? t("event.player"),
      state: s.state,
      minutes: Math.max(0, Math.round((nowMs - s.since) / 60_000)),
      help: helpWanted.has(`/host/set/${s.id}`),
      noCode: s.state === "ready" ? missingCode([s.p1_id, s.p2_id]) : [],
      needsSetup: !!event.setups && !s.live?.station, // a numbered setup is on its way
      noShow: clockFor(s),
    }));
  };
  const loadFriends = async () => {
    const others = entrants.map((x) => x.userId).filter((id) => id !== userId);
    if (!userId || !others.length) return [] as string[];
    const supabase = await createClient();
    const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", userId).eq("status", "active").in("followee_id", others.slice(0, 600));
    return ((data ?? []) as { followee_id: string }[]).map((f) => f.followee_id);
  };
  // The host's latest messages ("Host: …" notifications): players see the ones sent to them; the host sees what they sent.
  const loadHostMessages = async (): Promise<{ text: string; at: string }[]> => {
    if (!userId || (!isHost && !me)) return [];
    const db = isHost ? createAdminClient() : await createClient();
    let q = db.from("notifications").select("event_name, created_at").eq("type", "event_update").eq("event_href", `/host/${event.id}`).like("event_name", "Host: %");
    if (!isHost) q = q.eq("user_id", userId);
    const { data } = await q.order("created_at", { ascending: false }).limit(isHost ? 60 : 3);
    const seen = new Set<string>();
    const suffix = ` (${event.name})`;
    return ((data ?? []) as { event_name: string; created_at: string }[])
      .filter((n) => !seen.has(n.event_name) && seen.add(n.event_name))
      .slice(0, 3)
      .map((n) => ({ text: n.event_name.replace(/^Host: /, "").replace(suffix, "").trim(), at: n.created_at }));
  };
  // Online: my opponent's connect code right under "Your set is ready" (the server shows it to the two players and the TO).
  const opponentId = mySet ? (mySet.p[0].id === myId ? mySet.p[1].id : mySet.p[0].id) : null;
  // Online events: my connect code, so I can add it before my first set is called (only I can read mine).
  // Knocked out of a running bracket (not pools): a note instead of set prompts, and no code box.
  const iAmOut = !!myId && event.status === "in_progress" && !mySet && sets.some((x) => knockedOut(sets, x) === myId);
  const showCode = !!me && !social && !doubles && event.online && !finished && !event.removed && event.status !== "canceled" && !iAmOut;
  const showOpponentCode = !!(!doubles && event.online && opponentId && !myReported && !entrants.find((x) => x.userId === opponentId)?.guest);
  // Both looked up at once, alongside everything else below; a failed lookup just hides the line (or leaves the box empty).
  const codeOf = async (db: Awaited<ReturnType<typeof createClient>>, who: string) =>
    ((await db.from("hosted_connect_codes").select("code").eq("event_id", event.id).eq("user_id", who).maybeSingle()).data?.code as string | undefined) ?? null;
  const codesPromise = Promise.all([
    showCode ? codeOf(await createClient(), userId!).catch(() => null) : Promise.resolve(null),
    showOpponentCode ? connectCodeFor(event.id, opponentId!).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  const [players, medals, running, records, liveScores, friendIds, rules, eventPosts, hostMessages, latest, stations, myEntries, paid, discord] = await Promise.all([
    finished || pending ? bracketPlayers(event.id) : Promise.resolve(null),
    editions.length > 1 && completedEditions > 0 ? getSeriesMedals(completedIds).catch(() => []) : Promise.resolve([]),
    loadRunning(),
    isHost && !bracketStarted ? getHostedRecords(entrants.map((x) => x.userId)).catch(() => ({})) : Promise.resolve({}),
    !isHost && bracketStarted && !finished ? liveGameScores(event.id).catch(() => ({})) : Promise.resolve({}),
    loadFriends().catch(() => [] as string[]),
    event.ruleset && !finished ? eventRules(event).catch(() => null) : Promise.resolve(null),
    event.removed ? Promise.resolve([]) : getHostedEventPosts(event.id, userId).catch(() => []),
    loadHostMessages().catch(() => []),
    bracketStarted && !finished ? latestResults(event.id).catch(() => []) : Promise.resolve([]),
    !isHost && bracketStarted && !finished ? setStations(event.id).catch(() => ({})) : Promise.resolve({}),
    severalBrackets ? getMyEntries(userId, brackets.map((b) => b.id)).catch(() => new Set<string>()) : Promise.resolve(new Set<string>()),
    // The TO's "who has paid" ticks: read only for someone who runs the event.
    isHost && !event.removed && !finished && event.status !== "canceled" ? getPaidEntries(event.id).catch(() => [] as string[]) : Promise.resolve(null),
    // Whether a Discord channel is connected (only that: the link itself never reaches a page). Main host, main event.
    isMainHost && !event.parentId && !event.removed && !finished && event.status !== "canceled" ? getDiscordStatus(event.id).catch(() => null) : Promise.resolve(null),
  ]);
  // Names on the scene's PR, for the host to check before copying to Challonge (Braacket).
  const prList = isHost && finished && !event.challongeUrl && players ? await prRows(event.hostId, players).catch(() => []) : [];
  // The main host adds brackets from the main event (up to 8), while it isn't canceled or hidden.
  const main = brackets.find((b) => b.main);
  const addBracketHref =
    isMainHost && !event.removed && main && main.status !== "canceled" && brackets.length <= MAX_EXTRA_BRACKETS ? `/host/new?parent=${mainId}` : undefined;
  // While nobody is on stream, the TO gets a one-tap "Stream" button on one set: the one the stream
  // overlay would follow anyway (the deepest set without a setup), so events that don't stream see one small button.
  const setupOf = new Map(running.map((r) => [r.id, r.station]));
  const streamPick =
    isHost && !running.some((r) => isStreamSetup(r.station ?? undefined))
      ? pickStreamSet(sets.filter((s) => (s.state === "live" || s.state === "ready") && !setupOf.get(s.key) && !running.find((r) => r.id === s.key)?.reported))?.key
      : undefined;
  // Seeding help for a weekly: how today's entrants placed at the series' last finished edition.
  const lastEdition = isHost && !bracketStarted ? ([...editions].reverse().find((ed) => ed.status === "completed" && ed.startsAt < event.startsAt) ?? null) : null;
  const lastPlaces = lastEdition ? await getPlacementsFrom(lastEdition.id, entrants).catch(() => ({}) as Record<string, number>) : {};
  const [myCode, opponentCodeFound] = await codesPromise;
  const opponentCode: string | null | undefined = opponentCodeFound;
  const friends = entrants.filter((x) => friendIds.includes(x.userId));
  // Before the start: the first round (or pools) with the current seeding (checked-in players only when check-in is on).
  const previewSeeds = entrants.filter((x) => event.checkinMinutes === 0 || x.checkedIn).map((x) => x.userId);
  const preview = beforeBracket && !event.removed && event.format !== "social" ? bracketPreview(previewSeeds, event.format) : null;
  const resultPlayers = finished ? players : null;
  let nextUp: { key: string; identifier: string | null; waitingOn: string; feeder: FeederStatus | null } | null = null;
  if (pending && players) {
    const shown = toBracket(event, sets, players, pending.pool).rounds.flatMap((r) => r.sets).find((x) => x.id === pending.key);
    const label = shown?.waitingOn.find((w) => w) ?? null;
    // The set that decides my opponent: its live score, or who's in it and where if it hasn't started.
    const feeder = feederStatus(sets, pending.key, {
      tag: (pid) => (pid ? (tagOf.get(pid) ?? t("event.player")) : t("event.tbd")),
      scores: liveScores as Record<string, [number, number]>,
      setups: stations as Record<string, string>,
    });
    if (label) nextUp = { key: pending.key, identifier: pending.identifier, waitingOn: label, feeder };
  }

  return (
    <LangProvider lang={lang}>
      {!event.removed && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: eventJsonLd({
              name: event.name,
              url: new URL(`/host/${event.id}`, siteUrl()).toString(),
              startIso: event.startsAt,
              online: event.online,
              address: event.location,
              canceled: event.status === "canceled",
              // A finished event says who won (only names this viewer can see).
              description: [results && resultPlayers ? winnersLine(finalPlacements(sets), (pid) => resultPlayers.get(pid)?.tag ?? null) : null, event.description].filter(Boolean).join(". ") || null,
            }),
          }}
        />
      )}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <GameBadge game={event.game} />
          <span className="badge border border-line font-normal">{event.online ? <>{t("event.online")}</> : <>{t("event.inPerson")}</>}</span>
          {doubles && <span className="badge border border-line font-normal">{t("event.doubles")}</span>}
          <span className={`badge font-normal ${event.status === "canceled" ? "border border-danger text-danger" : "border border-line"}`}>{STATUS_KEY[event.status] ? t(STATUS_KEY[event.status]) : event.status}</span>
        </div>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm">
          <b><LocalTime iso={event.startsAt} style="dayDateTime" zone /></b>
          <HostLocalTime iso={event.startsAt} timeZone={event.timezone} />
          {" · "}
          {event.online ? (event.region ?? t("event.anyoneCanJoin")) : event.location}
          {!event.online && event.location && (
            <>
              {" · "}
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="link">
                <Icon name="pin" /> {t("event.directions")}
              <NewTab /></a>
            </>
          )}
        </p>
        {["open", "closed"].includes(event.status) && !event.removed && <StartsIn iso={event.startsAt} />}
        {event.host && (
          <Link href={`/u/${event.host.handle}`} className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
            <Avatar name={event.host.tag} src={event.host.avatarUrl} size="sm" />
            {t("event.hostedBy")} <b className="text-foreground">{event.host.tag}</b>
          </Link>
        )}
        {event.runBy && (
          <p className="text-sm text-muted">
            {t("event.officialRunBy")} <Link href={`/u/${event.runBy.handle}`} className="font-semibold text-foreground hover:underline">{event.runBy.tag}</Link>
          </p>
        )}
        {cohosts.length > 0 && (
          <p className="text-sm text-muted">
            {t("event.cohosts", { n: cohosts.length })}{" "}
            {cohosts.map((c, i) => (
              <span key={c.userId}>
                {i > 0 && ", "}
                <Link href={`/u/${c.handle}`} className="font-semibold text-foreground hover:underline">{c.tag}</Link>
              </span>
            ))}
          </p>
        )}
        {event.removed && <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">{t("event.hiddenByMods")}</p>}
        {event.status === "completed" && (
          <Suspense fallback={null}>
            <SeasonsCounting source="smashy" refs={[event.id]} />
            {isHost && <AddToSeasons event={event} userId={userId} />}
          </Suspense>
        )}
      </header>

      {severalBrackets && !event.removed && (
        <EventBrackets brackets={brackets} currentId={event.id} mine={myEntries} signedIn={!!userId} addHref={addBracketHref} now={nowMs} />
      )}

      {bracketStarted && !finished && <BracketLive eventId={event.id} />}
      {isHost && <PendingInTitle count={running.filter((s) => s.reported).length} />}
      {hostMessages.length > 0 && !finished && (
        <section className="card flex flex-col gap-1.5 border-brand/40 p-4" aria-labelledby="host-messages">
          <h2 id="host-messages" className="font-bold">{t("event.fromHost")}</h2>
          <ul className="flex flex-col gap-1.5">
            {hostMessages.map((m) => (
              <li key={m.at} className="text-sm">
                {m.text} <span className="text-meta text-muted">· <LocalTime iso={m.at} style="time" /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {nextUp && <NextUpCard setId={nextUp.key} identifier={nextUp.identifier} waitingOn={nextUp.waitingOn} feeder={nextUp.feeder} />}
      {mySet && <MySetButton setId={mySet.key} opponent={myOpponent ?? t("event.yourOpponent")} setup={myStation} reported={myReported} opponentCode={opponentCode} />}
      {iAmOut && <OutNote eventId={event.id} game={event.game} online={event.online} />}
      {bracketStarted && (
        <Link href={`/host/${event.id}/bracket`} className={`btn btn-lg ${mySet ? "btn-outline" : "btn-primary"}`}>{finished ? t("event.seeBracket") : t("event.liveBracket")}</Link>
      )}
      {running.some((s) => s.reported) && (
        <section className="card flex flex-col gap-1 border-brand p-4" aria-labelledby="to-confirm">
          <h2 id="to-confirm" className="font-bold">{t("hostrun.confirm.title")}</h2>
          <p className="text-meta text-muted">{t("hostrun.confirm.hint")}</p>
          {(() => {
            const agreedCount = running.filter((s) => finalsAgree(s.finals)).length;
            return agreedCount >= 2 ? <ConfirmAllAgreed eventId={event.id} count={agreedCount} /> : null;
          })()}
          <ul className="divide-y divide-line">
            {running.filter((s) => s.reported).map((s) => {
              const names: [string, string] = [s.p1, s.p2];
              const agreed = finalsAgree(s.finals);
              const reports = (["1", "2"] as const).flatMap((k) => (s.finals[k] ? [s.finals[k]!] : []));
              const one = reports.length === 1 ? reports[0] : null;
              const shown = agreed ?? one;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="w-8 font-mono text-muted">{s.identifier}</span>
                  <span className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] sm:basis-auto">
                    {shown ? (
                      <>
                        <b>{names[shown.winner - 1]}</b> {t("hostrun.confirm.won")} <span className="whitespace-nowrap">{Math.max(...shown.score)}–{Math.min(...shown.score)}</span> vs {names[shown.winner === 1 ? 1 : 0]}
                        <span className="text-muted"> · {agreed ? t("hostrun.confirm.bothAgree") : t("hostrun.confirm.onePlayer")}</span>
                      </>
                    ) : (
                      <>
                        {s.p1} vs {s.p2} <b className="text-danger">{t("hostrun.confirm.disagree")}</b>
                      </>
                    )}
                  </span>
                  <span className="ml-10 flex items-center gap-2 sm:ml-0">
                  {shown && <QuickConfirm setId={s.id} />}
                  <Link href={`/host/set/${s.id}`} className="btn btn-sm btn-outline">{shown ? t("hostrun.confirm.open") : t("hostrun.confirm.review")}</Link>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {running.some((s) => !s.reported) && (
        <section className="board flex flex-col gap-1 p-4" aria-labelledby="running">
          <div className="flex items-center justify-between gap-2">
            <h2 id="running" className="font-bold">{t("hostrun.running.title")}</h2>
            {running.some((s) => !s.reported && s.state === "live") && <LiveDot>{t("event.liveCount", { n: running.filter((s) => !s.reported && s.state === "live").length })}</LiveDot>}
          </div>
          <p className="text-meta text-muted">
            {t("hostrun.running.oldestFirst")}{" "}
            {event.setups
              ? t("hostrun.running.setupsHint", { n: event.setups })
              : t("hostrun.running.longWait")}
            {event.noShowMinutes ? t("hostrun.running.noShowRule", { n: event.noShowMinutes }) : ""}
          </p>
          {running.some((s) => s.station) && (
            <p className="text-meta text-muted">
              {t("hostrun.running.setupsInUse")} <b className="text-foreground">{[...new Set(running.map((s) => s.station).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, undefined, { numeric: true })).join(", ")}</b>
            </p>
          )}
          <ul className="divide-y divide-line">
            {running.filter((s) => !s.reported).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-1 py-1 sm:flex-nowrap sm:py-0">
                <Link href={`/host/set/${s.id}`} className="flex min-w-0 basis-full items-center gap-2 py-1 text-sm hover:underline sm:flex-1 sm:basis-auto sm:py-2">
                  <span className="w-8 font-mono text-muted">{s.identifier}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{s.p1} <span className="font-normal text-muted">vs</span> {s.p2}{s.help && <b className="ml-2 text-danger"><Icon name="alert" /> {t("hostrun.running.needsHelp")}</b>}</span>
                    {s.noCode.length > 0 && <span className="text-meta text-muted"><Icon name="globe" /> {t("hostrun.running.noCode", { list: s.noCode.join(", ") })}</span>}
                    {s.needsSetup && <span className="text-meta text-muted">{t("hostrun.running.waitingSetup")}</span>}
                    {s.noShow && !s.noShow.overdue && (
                      <span className="text-meta text-muted">
                        {s.noShow.left < 60_000 ? t("hostrun.running.clockSoon") : t("hostrun.running.clockIn", { n: Math.round(s.noShow.left / 60_000) })}
                        {s.noShow.missing.length === 1 ? t("hostrun.running.isHere", { name: s.noShow.missing[0] === 1 ? s.p2 : s.p1 }) : ""}
                      </span>
                    )}
                    {s.noShow?.overdue && (
                      <span className="text-meta font-semibold text-danger">
                        {t("hostrun.running.overdue", { names: s.noShow.missing.map((m) => (m === 1 ? s.p1 : s.p2)).join(t("hostrun.running.and")) })}
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 text-meta ${s.minutes >= 15 ? "font-semibold text-danger" : "text-muted"}`}>
                    {s.state === "live" && <span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" />}
                    {s.state === "live" ? t("hostrun.running.playing") : t("hostrun.running.waiting")} · {s.minutes} min
                  </span>
                </Link>
                <span className="ml-auto flex items-center gap-1">
                  <StationInput key={`${s.id}:${s.station ?? ""}`} setId={s.id} station={s.station} suggest={event.setups ? undefined : nextFreeSetup(running.map((r) => r.station))} streamFree={!s.station && s.id === streamPick} />
                  {s.state === "ready" && s.minutes >= 3 && <NudgeButton setId={s.id} />}
                  {s.noShow?.overdue && s.noShow.missing.map((m) => <NoShowDq key={m} setId={s.id} slot={m} name={m === 1 ? s.p1 : s.p2} other={m === 1 ? s.p2 : s.p1} />)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!isHost && bracketStarted && !finished && <OnNow sets={sets} scores={liveScores} stations={stations} tagOf={(pid) => (pid ? tagOf.get(pid) ?? t("event.player") : t("event.tbd"))} />}
      {bracketStarted && !finished && latest.length > 0 && (
        <section className="card flex flex-col gap-1 p-4" aria-labelledby="latest-results">
          <h2 id="latest-results" className="font-bold">{t("event.latestResults")}</h2>
          <ul className="divide-y divide-line">
            {latest.map((r) => {
              const [a, b] = r.p.map((pid) => tagOf.get(pid ?? "") ?? t("event.player"));
              return (
                <li key={r.id}>
                  <Link href={`/host/set/${r.id}`} className="flex items-center gap-2 py-2 text-sm hover:underline">
                    <span className="w-8 font-mono text-muted">{r.identifier}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className={r.winner === 1 ? "font-semibold" : "text-muted"}>{a}</span> vs <span className={r.winner === 2 ? "font-semibold" : "text-muted"}>{b}</span>
                    </span>
                    <span className="shrink-0 font-mono text-meta tabular-nums">{scoreLine(r.score[0], r.score[1])}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {results && resultPlayers && (
        <section className="flex flex-col gap-2" aria-labelledby="final">
          <h2 id="final" className="font-bold">{results.kind !== "elimination" ? t("event.finalStandings") : t("event.top8")}</h2>
          <Results results={results} players={resultPlayers} limit={8} />
          <div>
            <CopyResults text={resultsText(event.name, finalPlacements(sets), (id) => resultPlayers.get(id)?.tag ?? null, new URL(`/host/${event.id}`, siteUrl()).toString(), 8, { title: (n) => t("event.copy.title", { event: n }), full: (u) => t("event.copy.full", { url: u }) })} />
          </div>
          {/* Round robins copy too, when they're one pool (several pools aren't one bracket on Challonge). */}
          {/* One bracket only: not Swiss, and not pools or Swiss followed by a final bracket. */}
          {event.format !== "swiss" && !event.finalFormat && !sets.some((s) => (s.pool ?? 1) > 1) && <ChallongeCopy eventId={event.id} url={event.challongeUrl} canCopy={isHost} prRows={prList} />}
          <p className="text-sm text-muted">
            <Icon name="image" /> {t("event.graphic.label")}{" "}
            <a href={`/host/${event.id}/top8.png${lang === "en" ? "" : `?lang=${lang}`}`} target="_blank" rel="noopener" className="link">{t("event.graphic.link")}<NewTab /></a>
          </p>
          <p className="text-sm text-muted">
            <Icon name="file" /> {t("event.resultsFile.label")}{" "}
            <a href={`/host/${event.id}/results.json`} target="_blank" rel="noopener" className="link">results.json<NewTab /></a>
            <span className="block text-meta">
              {t("event.resultsFile.hint")}{" "}
              <Link href="/host/results-file" className="link">{t("event.resultsFile.about")}</Link>
            </span>
          </p>
        </section>
      )}
      {!event.removed && (
        <EventShareActions
          eventId={event.id}
          canShare={finished && (isHost || !!me?.placement)}
          shareLabel={isHost ? t("event.shareResults") : t("event.shareMyResult")}
          // Not once next week's event exists (the "Next up" card links to it): a second press made a twin.
          // A whole event runs again (its extra brackets come along), never one bracket of it.
          canRunAgain={isMainHost && !event.parentId && (event.status === "in_progress" || event.status === "completed") && !nextEdition}
        />
      )}
      {/* Your result picture: as yourself in singles, or as your team (by your own handle) in doubles. */}
      {finished && !event.removed && me?.placement && (me.guest ? me.members?.find((m) => m.userId === userId)?.handle : me.handle) && (
        <p className="text-sm text-muted">
          <Icon name="image" /> {t("event.myCard.label")}{" "}
          <a href={`/host/${event.id}/result/${me.guest ? me.members?.find((m) => m.userId === userId)?.handle : me.handle}.png${lang === "en" ? "" : `?lang=${lang}`}`} target="_blank" rel="noopener" className="link">{t("event.myCard.link")}</a>
          <span className="block text-meta">{t("event.myCard.hint")}</span>
        </p>
      )}
      {nextEdition && (
        <Link href={`/host/${nextEdition.id}`} className="card flex items-center gap-3 p-4 hover:bg-surface">
          <Icon name="repeat" className="text-2xl text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t("event.nextEdition", { name: nextEdition.name })}</span>
            <span className="block text-meta text-muted"><LocalTime iso={nextEdition.startsAt} style="dayDateTime" /> · {t("event.status.open")}</span>
          </span>
          <b className="shrink-0 text-brand">{t("event.signUpArrow")}</b>
        </Link>
      )}
      {editions.length > 1 && (
        <nav aria-label={t("event.otherEditions")} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{t("event.series")}</span>
          {editions.map((ed, i) => (
            <Link key={ed.id} href={`/host/${ed.id}`} aria-current={ed.id === event.id ? "page" : undefined} className="chip">
              {[...ed.name.matchAll(/#\s*(\d+)/g)].pop()?.[0].replace(/\s+/g, "") ?? `#${i + 1}`}
            </Link>
          ))}
          <Link href={`/host/${event.seriesId ?? event.id}/series`} className="link">
            {t("event.seriesStats")}
          </Link>
        </nav>
      )}
      {medals.length > 0 && (
        <section className="card flex flex-col gap-1 p-4" aria-labelledby="series-medals">
          <h2 id="series-medals" className="font-bold">{t("event.seriesMedals")}</h2>
          <p className="text-meta text-muted">{t("event.seriesMedalsHint", { n: completedEditions })}</p>
          <ol className="divide-y divide-line">
            {medals.map((m) => (
              <li key={m.userId} className="flex items-center gap-2 py-1.5 text-sm">
                <Link href={`/u/${m.handle}`} className="min-w-0 flex-1 truncate hover:underline">{m.tag}</Link>
                <span className="shrink-0"><MedalCounts gold={m.gold} silver={m.silver} bronze={m.bronze} /></span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {/* TOs at locals nearly always play too: the host and co-TOs can enter like anyone else. */}
      {!bracketStarted && doubles && (
        <TeamActions
          asHost={isHost}
          eventId={event.id}
          signedIn={!!userId}
          team={me?.tag ?? null}
          checkedIn={!!me?.checkedIn}
          canJoin={canJoin}
          canWithdraw={beforeBracket}
          checkInOpen={checkInOpen}
          full={entrants.length >= event.entrantCap}
        />
      )}
      {!bracketStarted && !doubles && (
        <EntrantActions
          asHost={isHost}
          eventId={event.id}
          signedIn={!!userId}
          joined={!!me}
          checkedIn={!!me?.checkedIn}
          canJoin={canJoin}
          canWithdraw={beforeBracket}
          checkInOpen={checkInOpen}
          full={entrants.length >= event.entrantCap}
          waiting={myWait}
          waitlist={waitlist.length}
        />
      )}
      {showCode && (
        <ConnectCodeForm
          eventId={event.id}
          current={myCode}
          placeholder={event.game === "melee" ? t("event.code.melee") : event.game === "ultimate" ? t("event.code.ultimate") : t("event.code.other")}
        />
      )}
      {me && !me.checkedIn && event.checkinMinutes > 0 && !checkInOpen && !started && (
        <p className="text-sm text-muted">
          {t("event.checkIn.opensBefore", { n: event.checkinMinutes })}
          {opens !== null && <StartsIn iso={new Date(opens).toISOString()} prefix={t("event.checkIn.opensIn")} className="font-semibold text-brand" />}
          {t("event.checkIn.reminder")}
        </p>
      )}

      {isHost && !social && !event.removed && event.status !== "canceled" && (
        <section className="card flex flex-col gap-2 p-4" aria-labelledby="bracket-tools">
          <h2 id="bracket-tools" className="font-bold">Bracket</h2>
          {!bracketStarted && notCheckedIn.length > 0 && (
            <p className="text-meta text-muted">{t("hostrun.tools.notCheckedIn", { list: notCheckedIn.map((x) => x.tag).join(", ") })}</p>
          )}
          <BracketControls
            eventId={event.id}
            started={bracketStarted}
            finished={finished}
            readyCount={event.checkinMinutes > 0 ? checkedInCount : entrants.length}
            checkIn={event.checkinMinutes > 0}
            teams={doubles}
          />
          {swiss && event.status === "in_progress" && !sets.some(isElimination) && <SwissRound eventId={event.id} round={swiss.round} rounds={swiss.rounds} open={swiss.open} canRepair={swiss.untouched} />}
          {finalWaiting && event.status === "in_progress" && event.finalFormat && (
            <FinalBracketStart eventId={event.id} size={event.finalSize ?? 8} format={FORMAT_LABEL[event.finalFormat]} ready={finalWaiting.ready} first={event.format === "swiss" ? "Swiss rounds" : "pools"} />
          )}
          {!finished && (
            <p className="text-meta text-muted">
              <Icon name="video" /> {t("hostrun.tools.overlayBefore")}{" "}
              <a href={`/host/${event.id}/overlay${lang === "en" ? "" : `?lang=${lang}`}`} target="_blank" rel="noopener noreferrer" className="link">{t("hostrun.tools.overlayLink")}<NewTab /></a>{" "}
              {t("hostrun.tools.overlayAfter")}
            </p>
          )}
          {!finished && <CopyOverlayLink path={`/host/${event.id}/overlay${lang === "en" ? "" : `?lang=${lang}`}`} />}
          {!finished && (
            <p className="text-meta text-muted">
              {t("hostrun.tools.moreBefore")}{" "}
              <a href={`/host/${event.id}/overlay/next${lang === "en" ? "" : `?lang=${lang}`}`} target="_blank" rel="noopener noreferrer" className="link">{t("hostrun.tools.nextLink")}<NewTab /></a>{" "}
              {t("hostrun.tools.moreMiddle")}{" "}
              <a href={`/host/${event.id}/commentary`} target="_blank" rel="noopener noreferrer" className="link">{t("hostrun.tools.commentaryLink")}<NewTab /></a>{" "}
              {t("hostrun.tools.moreAfter")}
            </p>
          )}
          {!finished && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/host/${event.id}/poster`} className="btn btn-sm btn-outline">
                <Icon name="printer" /> {t("hostrun.tools.poster")}
              </Link>
              <Link href={`/host/${event.id}/screen`} className="btn btn-sm btn-outline">
                <Icon name="video" /> {t("hostrun.tools.screen")}
              </Link>
            </div>
          )}
          {!finished && <p className="text-meta text-muted">{t("hostrun.tools.screenHint")}</p>}
          <EmbedCode code={embedSnippet(siteUrl().origin, event.id, event.name)} previewHref={`/host/${event.id}/embed`} />
          {!finished && <Link href="/host/guide" className="text-meta text-muted hover:text-foreground">{t("hostrun.tools.firstTime")}</Link>}
          {!severalBrackets && addBracketHref && (
            <p className="text-meta text-muted">
              {t("hostrun.tools.moreBrackets")}{" "}
              <Link href={addBracketHref} className="link">{t("hostrun.tools.addBracket")}</Link>{t("common.period")}
            </p>
          )}
        </section>
      )}
      {event.description && (
        <section className="card p-4">
          <h2 className="mb-1 font-bold">{t("event.about")}</h2>
          <LinkifiedText text={event.description} game={event.game} />
        </section>
      )}
      <section className="card grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-sm" aria-label={t("event.details")}>
        <span className="text-muted">{t("event.details.format")}</span>
        <span>{formatSummary(event, t)}</span>
        {!social && <span className="text-muted">{t("event.details.sets")}</span>}
        {!social && <span>{t("event.details.bestOf", { n: event.bestOf })}{event.bestOfTop && event.bestOfTop !== event.bestOf ? t("event.details.bestOfTop", { n: event.bestOfTop }) : ""}</span>}
        <span className="text-muted">{doubles ? t("event.details.teams") : t("event.details.players")}</span>
        <span>{entrants.length} / {event.entrantCap}{event.checkinMinutes > 0 ? t("event.details.checkedIn", { n: checkedInCount }) : ""}{waitlist.length > 0 ? t("event.details.waiting", { n: waitlist.length }) : ""}</span>
        <span className="text-muted">{t("event.details.checkIn")}</span>
        <span>{event.checkinMinutes > 0 ? t("event.details.checkInBefore", { n: event.checkinMinutes }) : t("event.details.noCheckIn")}</span>
        {event.ruleset && (
          <>
            <span className="text-muted">{t("event.details.ruleset")}</span>
            <span>
              <Link href={`/rulesets/${event.ruleset.id}`} className="link">{event.ruleset.name}</Link>
              {" · "}
              <Link href={`/rulesets/${event.ruleset.id}/strike`} className="link">{t("event.details.strike")}</Link>
            </span>
          </>
        )}
        {rules && rules.starters.length > 0 && (
          <>
            <span className="text-muted">{t("event.details.stages")}</span>
            <details>
              <summary className="cursor-pointer">
                {t("event.details.starters", { n: rules.starters.length })}
                {rules.counterpicks.length > 0 && t("event.details.counterpicks", { n: rules.counterpicks.length })}
              </summary>
              <p className="mt-1">{t("event.details.startersList", { list: rules.starters.join(", ") })}</p>
              {rules.counterpicks.length > 0 && <p className="mt-1">{t("event.details.counterpicksList", { list: rules.counterpicks.join(", ") })}</p>}
            </details>
            <span className="text-muted">{t("event.details.afterGame")}</span>
            <span>
              {rules.bans > 0 ? t("event.details.winnerBans", { n: rules.bans }) : t("event.details.noBans")}
              {rules.dsr !== "none" ? ` · ${rules.dsr === "modified" ? t("event.details.modifiedDsr") : t("event.details.dsr")}` : ""}
            </span>
          </>
        )}
      </section>

      {preview && (
        <details className="card p-4">
          <summary className="cursor-pointer font-bold">{preview.kind === "pools" ? t("event.preview.pools") : t("event.preview.firstRound")}</summary>
          <p className="mt-1 text-meta text-muted">
            {event.checkinMinutes > 0 ? t("event.preview.hintCheckedIn", { n: previewSeeds.length }) : t("event.preview.hint")}
          </p>
          {preview.kind === "elimination" ? (
            <ul className="mt-2 divide-y divide-line text-sm">
              {preview.matches.map(([a, b], i) => (
                <li key={i} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate">{a ? tagOf.get(a) ?? t("event.player") : t("event.bye")}</span>
                  <span className="shrink-0 text-meta text-muted">vs</span>
                  <span className={`min-w-0 flex-1 truncate text-right ${b ? "" : "text-muted"}`}>{b ? tagOf.get(b) ?? t("event.player") : t("event.bye")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ol className="mt-2 flex flex-col gap-2 text-sm">
              {preview.pools.map((pool, i) => (
                <li key={i}>
                  <b>{t("event.preview.pool", { n: i + 1 })}</b> {pool.map((id) => tagOf.get(id) ?? t("event.player")).join(", ")}
                </li>
              ))}
            </ol>
          )}
        </details>
      )}

      {isHost && !event.removed && !finished && event.status !== "canceled" && entrants.length > 0 && (
        <HostAnnounce eventId={event.id} players={entrants.length} />
      )}
      {isHost && !event.removed && !finished && event.status !== "canceled" && !event.parentId && (
        <Cohosts eventId={event.id} cohosts={cohosts} mainHost={isMainHost} me={userId} />
      )}
      {isMainHost && event.parentId && !event.removed && !finished && event.status !== "canceled" && (
        <p className="text-meta text-muted">
          {t("hostrun.tools.cohostsNote")} <Link href={`/host/${event.parentId}`} className="link">{t("hostrun.tools.cohostsLink")}</Link>{t("common.period")}
        </p>
      )}
      {paid && entrants.length > 0 && (
        <PaidList
          key={`${entrants.length}:${paid.length}`}
          eventId={event.id}
          entries={entrants.map((x) => ({ id: x.userId, tag: x.tag }))}
          paid={paid}
          teams={doubles}
        />
      )}
      {discord && !social && <DiscordCard key={`${discord.connected}`} eventId={event.id} connected={discord.connected} calls={discord.calls} canAnnounce={beforeBracket} />}
      {isHost && !bracketStarted && (
        <HostPanel
          records={records}
          lastEdition={lastEdition && Object.keys(lastPlaces).length > 0 ? { name: lastEdition.name, places: lastPlaces } : undefined}
          key={entrants.map((x) => `${x.userId}:${x.checkedIn ? 1 : 0}`).join(",")}
          checkIn={event.checkinMinutes > 0}
          eventId={event.id}
          status={event.status}
          editable={["open", "closed"].includes(event.status) && !event.removed}
          mainHost={isMainHost}
          bracket={!!event.parentId}
          social={social}
          doubles={doubles}
          // Extra brackets that haven't started are canceled with their main event.
          extraBrackets={event.parentId ? 0 : brackets.filter((b) => !b.main && (b.status === "open" || b.status === "closed")).length}
          entrants={entrants.map((x) => ({ userId: x.userId, tag: x.tag, checkedIn: x.checkedIn }))}
        />
      )}
      {isHost && !social && !bracketStarted && ["open", "closed"].includes(event.status) && !event.removed && severalBrackets && !doubles && (
        <BringPlayers
          eventId={event.id}
          // Brackets with players in them, the ones that have started first (that's where "who's out" comes from).
          sources={brackets
            .filter((b) => b.id !== event.id && b.status !== "canceled" && b.players > 0 && b.teamSize === 1)
            .map((b) => ({ id: b.id, label: b.label, started: b.status === "in_progress" || b.status === "completed", cut: defaultCut(b.players) }))
            .sort((a, b) => Number(b.started) - Number(a.started))}
        />
      )}
      {isHost && !bracketStarted && ["open", "closed"].includes(event.status) && !event.removed && !doubles && !social && <StartggImport eventId={event.id} />}

      {eventPosts.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="event-posts">
          <h2 id="event-posts" className="font-bold">{t("event.posts")}</h2>
          <div className="card flex flex-col divide-y divide-line">
            {eventPosts.map((p) => <div key={p.id}><PostCard post={p} now={Math.floor(nowMs / 1000)} viewerId={userId} hideEventCard /></div>)}
          </div>
        </section>
      )}
      <section aria-labelledby="entrants" className="flex flex-col gap-2">
        <h2 id="entrants" className="font-bold">{doubles ? t("event.details.teams") : t("event.details.players")} ({entrants.length})</h2>
        {friends.length > 0 && (
          <p className="text-sm">
            {t("event.friendsIn", { n: friends.length })}{" "}
            <b>{friends.slice(0, 5).map((f) => f.tag).join(", ")}{friends.length > 5 ? t("event.andMore", { n: friends.length - 5 }) : ""}</b>
          </p>
        )}
        {entrants.length === 0 ? (
          <p className="text-sm text-muted">{t("event.nobodyYet")}</p>
        ) : (
          <ol className="card divide-y divide-line">
            {entrants.map((x, i) => (
              <li key={x.userId}>
                {x.guest ? (
                  // A walk-in the host added: no profile to open.
                  <div className="flex items-center gap-3 px-4 py-2">
                    <span className="w-6 text-right font-mono text-sm tabular-nums text-muted">{x.seed ?? i + 1}</span>
                    <Avatar name={x.tag} src={null} size="sm" />
                    {x.members ? (
                      // A doubles team: each member with an account links to their profile.
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {x.members.map((m, k) => (
                          <span key={k}>
                            {k > 0 && <span className="font-normal text-muted"> / </span>}
                            {m.handle ? <Link href={`/u/${m.handle}`} className="hover:underline">{m.name}</Link> : m.name}
                          </span>
                        ))}
                        {x.userId === myId && <span className="ml-2 badge border border-brand text-brand">{t("event.yourTeam")}</span>}
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {x.tag}
                        <span className="ml-2 badge border border-line text-muted">{t("event.walkIn")}</span>
                      </span>
                    )}
                    {x.checkedIn && <span className="text-meta text-muted">{t("event.checkedIn")}</span>}
                  </div>
                ) : (
                  <Link href={`/u/${x.handle}`} className={`flex items-center gap-3 px-4 py-2 hover:bg-surface ${x.userId === userId ? "bg-brand/5" : ""}`}>
                    <span className="w-6 text-right font-mono text-sm tabular-nums text-muted">{x.seed ?? i + 1}</span>
                    <Avatar name={x.tag} src={x.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {x.tag}
                      {x.userId === userId && <span className="ml-2 badge border border-brand text-brand">{t("event.you")}</span>}
                    </span>
                    {x.checkedIn && <span className="text-meta text-muted">{t("event.checkedIn")}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
        {waitlist.length > 0 && (
          <p className="text-sm text-muted">
            <b className="text-foreground">{t("event.waitlist", { n: waitlist.length })}</b> {waitingNames.names.join(", ")}
            {waitingNames.more > 0 ? (waitingNames.names.length ? t("event.andMore", { n: waitingNames.more }) : t("event.waitlistMore", { n: waitingNames.more })) : ""}
            {t("event.waitlistHint")}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <ShareButton path={`/host/${event.id}`} title={event.name} label={t("event.shareEvent")} />
        {userId && !event.removed && ["open", "closed", "in_progress"].includes(event.status) && <PostEventButton eventId={event.id} />}
        {!started && !bracketStarted && !event.removed && event.status !== "canceled" && (
          <a href={`/host/${event.id}/calendar.ics`} className="link" download><Icon name="calendar" /> {t("event.addToCalendar")}</a>
        )}
        {userId && !isHost && <LiveReportButton kind="event" targetId={event.id} />}
      </div>
    </LangProvider>
  );
}

export default function HostedEventPage(props: PageProps<"/host/[id]">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Link href="/events" className="text-sm text-muted hover:text-foreground"><T k="event.backToEvents" /></Link>
      <Suspense fallback={<PageSkeleton />}>
        <Event params={props.params} />
      </Suspense>
    </section>
  );
}
