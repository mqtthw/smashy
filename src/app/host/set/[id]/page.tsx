import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense, cache, type ReactNode } from "react";
import ReportSet from "@/components/host/ReportSet";
import SetRoom from "@/components/host/SetRoom";
import CallHostButton from "@/components/host/CallHostButton";
import { PlayerFinalReport, TOFinalReview } from "@/components/host/FinalScoreReport";
import CopyOverlayLink from "@/components/host/CopyOverlayLink";
import Scoreboard, { type BoardSide } from "@/components/host/Scoreboard";
import StationInput from "@/components/host/StationInput";
import { HereButton } from "@/components/host/NoShowButtons";
import SetVods from "@/components/vods/SetVods";
import LocalTime from "@/components/ui/LocalTime";
import { noShowStatus, setStarted } from "@/lib/setups";
import { unixNow } from "@/lib/format";
import { eventRules } from "@/lib/hostedRules";
import { freshLive, nextFreeSetup, type LiveState } from "@/lib/liveSet";
import { isStreamSetup } from "@/lib/streamSet";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { scoreLine, scoreText } from "@/lib/brackets/score";
import { ScoreboardSkeleton } from "@/components/ui/Skeleton";
import { canUndo, laterPlayed } from "@/lib/bracketEngine";
import { bracketPlayers, liveGameScores, loadEngineSets, setStations, toBracket } from "@/lib/hostedBracket";
import { feederStatus } from "@/lib/feederStatus";
import { getHeadToHead, getHostedEvent, runsEvent } from "@/lib/hostedEvents";
import { createClient, getUserId } from "@/lib/supabase/server";
import { slotInSet, teamsWithAccounts } from "@/lib/hostedTeams";
import { createAdminClient } from "@/lib/supabase/admin";
import { clip, ownPictureMeta } from "@/lib/siteMeta";
import ShareButton from "@/components/ui/ShareButton";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { localFeeder, localRound } from "@/lib/i18n/rounds";
import NewTab from "@/components/ui/NewTab";

/**
 * A phrase with {placeholders} filled by React nodes (a bold name, a link, a time): pass MARK (or
 * MARK2 for a second one) as their values, then the nodes in the same order.
 */
const MARK = "\u0001";
const MARK2 = "\u0002";
function withNode(text: string, ...nodes: ReactNode[]) {
  return <>{text.split(/([\u0001\u0002])/).map((part, i) => (part === MARK ? <Fragment key={i}>{nodes[0]}</Fragment> : part === MARK2 ? <Fragment key={i}>{nodes[1]}</Fragment> : part))}</>;
}

// One read per page view (round 732): the page's title and the page itself ask for the same data, and
// Smashy's time-limited database calls aren't de-duplicated by Next, so each used to run twice.
const eventIdOnce = cache(async (setId: string): Promise<string | null> => {
  const { data } = await (await createClient()).from("hosted_sets").select("event_id").eq("id", setId).maybeSingle();
  return (data?.event_id as string | undefined) ?? null;
});
const eventOnce = cache((id: string) => getHostedEvent(id));
const setsOnce = cache((eventId: string) => loadEngineSets(eventId));
const playersOnce = cache((eventId: string) => bracketPlayers(eventId));

/** "Alice vs Dan · Winners Semi-Final" in the tab and in link previews (Discord, texts), not just "Set". */
export async function generateMetadata({ params }: PageProps<"/host/set/[id]">): Promise<Metadata> {
  const fallback: Metadata = { title: "Set", robots: { index: false } };
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fallback;
  try {
    const eventId = await eventIdOnce(id);
    const event = eventId ? await eventOnce(eventId) : null;
    if (!event || event.removed) return fallback;
    const [sets, players] = await Promise.all([setsOnce(event.id), playersOnce(event.id)]);
    const set = sets.find((s) => s.key === id);
    if (!set) return fallback;
    const label = toBracket(event, sets, players, set.pool).rounds.flatMap((r) => r.sets).find((s) => s.id === id)?.roundLabel ?? `Set ${set.identifier ?? ""}`;
    const tag = (i: 0 | 1) => (set.p[i].id ? (players.get(set.p[i].id!)?.tag ?? "Player") : "TBD");
    const status =
      set.state === "done" && set.winner
        ? `${tag((set.winner - 1) as 0 | 1)} won ${scoreLine(set.score[set.winner - 1], set.score[2 - set.winner])}`
        : set.state === "live"
          ? "Live now"
          : set.state === "ready"
            ? "Up next"
            : "Coming up";
    return ownPictureMeta(`${tag(0)} vs ${tag(1)} · ${label}`, clip(`${status} · ${event.name} · Best of ${set.bestOf} on Smashy`, 200), { robots: { index: false } });
  } catch {
    return fallback;
  }
}

async function HostedSet({ params }: { params: PageProps<"/host/set/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const eventId = await eventIdOnce(id);
  if (!eventId) notFound();
  const [event, userId] = await Promise.all([eventOnce(eventId), getUserId()]);
  if (!event) notFound();
  const [sets, players] = await Promise.all([setsOnce(event.id), playersOnce(event.id)]);
  const set = sets.find((s) => s.key === id);
  if (!set) notFound();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  // The same labels and "Winner of B" hints as the bracket.
  const allShown = toBracket(event, sets, players, set.pool).rounds.flatMap((r) => r.sets);
  const shown = allShown.find((s) => s.id === id);
  // Later played sets a different winner here would clear ("Winners Semi-Final: A vs B").
  const later = set.state === "done"
    ? laterPlayed(sets, set.key).map((l) => {
        const shownLabel = allShown.find((x) => x.id === l.key)?.roundLabel;
        const label = shownLabel ? localRound(shownLabel, t) : `Set ${l.identifier ?? ""}`;
        const tag = (pid: string | null) => (pid ? (players.get(pid)?.tag ?? "Player") : "TBD");
        return `${label}: ${tag(l.p[0].id)} vs ${tag(l.p[1].id)}`;
      })
    : [];
  const isHost = await runsEvent(event, userId); // the host or a co-TO
  const names = set.p.map((p) => (p.id ? players.get(p.id)?.tag ?? "Player" : null)) as [string | null, string | null];
  const both = names[0] !== null && names[1] !== null;
  // A walk-in the host added (no account): they can't report from a phone.
  // (A doubles team with a member on Smashy isn't one: that member reports for the team.)
  const reporting = event.teamSize === 2 ? await teamsWithAccounts(event.id).catch(() => new Set<string>()) : new Set<string>();
  const walkIns = set.p.filter((p) => p.id && players.get(p.id) && !players.get(p.id)!.handle && !reporting.has(p.id)).map((p) => players.get(p.id!)!.tag);
  const walkIn = walkIns.length ? walkIns.reduce((a, b) => t("setroom.and", { a, b })) : null;
  const playable = both && (set.state === "ready" || set.state === "live");
  // Which side I'm on: as myself, or as a member of the team in that slot.
  const me = userId ? await slotInSet({ p1_id: set.p[0].id, p2_id: set.p[1].id }, userId) : null;
  // Their past results against each other on Smashy (this set included once it's finished).
  // (Loaded below with the rest, at the same time.)
  // The live set (strikes, games) and both players' connect codes (signed-in viewers only).
  // The TO can set or change the setup right here (the event page's list is the other place).
  const editSetup = playable && isHost && event.status === "in_progress";
  const [h2h, { data: liveRow }, { data: codeRows }, rules, setups] = await Promise.all([
    both ? getHeadToHead(set.p[0].id!, set.p[1].id!).catch(() => [0, 0] as [number, number]) : Promise.resolve([0, 0] as [number, number]),
    supabase.from("hosted_sets").select("live").eq("id", id).maybeSingle(),
    (me || isHost) && both
      ? createAdminClient().from("hosted_connect_codes").select("user_id, connect_code:code").eq("event_id", event.id).in("user_id", [set.p[0].id!, set.p[1].id!])
      : Promise.resolve({ data: [] }),
    eventRules(event),
    editSetup ? setStations(event.id).catch(() => ({}) as Record<string, string>) : Promise.resolve({} as Record<string, string>),
  ]);
  const otherSetups = Object.entries(setups).filter(([k]) => k !== id).map(([, v]) => v);
  // Waiting on another set (one player still TBD): what's happening in the set that decides it.
  const waitingFor =
    set.state === "waiting" && event.status === "in_progress"
      ? await Promise.all([liveGameScores(event.id).catch(() => ({})), setStations(event.id).catch(() => ({}))]).then(([scores, stations]) =>
          feederStatus(sets, set.key, { tag: (pid) => (pid ? (players.get(pid)?.tag ?? "Player") : "TBD"), scores, setups: stations }),
        )
      : null;
  const codeOf = (pid: string | null) => ((codeRows ?? []) as { user_id: string; connect_code: string | null }[]).find((r) => r.user_id === pid)?.connect_code ?? null;
  const live = ((liveRow?.live as LiveState | null) ?? freshLive(() => 0)) as LiveState;
  // The opponent already reported the final score and I haven't: agreeing is the one thing left to do,
  // so that box goes above the stage-strike room (on a phone it would otherwise be below the fold).
  const reportFirst = !!(me && live.finals?.[me === 1 ? "2" : "1"] && !live.finals?.[String(me) as "1" | "2"]);
  // The no-show clock (if the event has one): from when the set got its place to play, until both
  // players say they're here or anything happens in the set.
  const noShow =
    playable && event.status === "in_progress"
      ? noShowStatus({
          minutes: event.noShowMinutes,
          since: live.stationAt ? Date.parse(live.stationAt) : event.setups ? null : live.calledAt ? Date.parse(live.calledAt) : null,
          now: unixNow() * 1000,
          started: set.state === "live" || setStarted(live),
          here: live.here,
        })
      : null;
  const hereText = (i: 0 | 1) => t(live.here?.[String(i + 1) as "1" | "2"] ? "setroom.noShow.here" : "setroom.noShow.notHere", { name: names[i] ?? "" });
  // One side of the scoreboard: the player (linked to their profile) or who the set is waiting on,
  // and their games once it's over.
  const boardSide = (i: 0 | 1): BoardSide => {
    const pid = set.p[i].id;
    const info = pid ? players.get(pid) : null;
    return {
      top: info ? <Avatar name={info.tag} src={info.avatarUrl} size="sm" /> : <span className="h-8 w-8 rounded-full bg-surface-2" />,
      name: info ? (
        info.handle ? <Link href={`/u/${info.handle}`} className="hover:underline">{info.tag}</Link> : info.tag
      ) : (
        <span className="font-semibold text-muted">{shown?.waitingOn[i] ? localRound(shown.waitingOn[i]!, t) : "TBD"}</span>
      ),
      score: set.score.includes(-1) ? scoreText(set.score[i], set.score[1 - i]) : set.score[i],
    };
  };

  const roundName = shown?.roundLabel ? localRound(shown.roundLabel, t) : "Set";

  return (
    <LangProvider lang={lang}>
      <Link href={`/host/${event.id}/bracket${set.pool ? `?group=${set.pool}` : ""}`} className="text-sm text-muted hover:text-foreground">{t("setroom.backToBracket")}</Link>
      <header>
        <p className="text-meta text-muted">{t("setroom.eventSet", { event: event.name, id: set.identifier ?? "" })}</p>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{roundName}</h1>
          <ShareButton path={`/host/set/${set.key}`} title={`${names[0] ?? "TBD"} vs ${names[1] ?? "TBD"} · ${roundName}`} label={t("setroom.share")} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm text-muted">{t("setroom.bestOf", { n: set.bestOf })}{!editSetup && playable && live.station && <b className="ml-2 text-brand"><Icon name="pin" /> {live.station}</b>}</p>
          {editSetup && (
            <span className="ml-auto flex items-center gap-1 text-meta text-muted">
              <Icon name="pin" label={t("hostbracket.set.setup")} />
              <StationInput key={live.station ?? ""} setId={set.key} station={live.station ?? null} suggest={nextFreeSetup(otherSetups)} streamFree={!otherSetups.some((v) => isStreamSetup(v))} />
            </span>
          )}
        </div>
      </header>

      {playable && event.status === "in_progress" && event.setups && !live.station && (me || isHost) && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <Icon name="clock" /> <b>{t("setroom.waitingSetup")}</b>{" "}
          <span className="text-muted">{me ? t("setroom.waitingSetupMe") : t("setroom.waitingSetupOther")}</span>
        </p>
      )}
      {noShow && (me || isHost) && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <p>
            <Icon name="clock" />{" "}
            {me && live.here?.[String(me) as "1" | "2"] ? (
              <>
                {live.station ? withNode(t("setroom.noShow.markedHereAt", { station: MARK }), <b>{live.station}</b>) : t("setroom.noShow.markedHere")}{" "}
              </>
            ) : me ? (
              <>
                {/* The button's own label, as HereButton shows it (not translated yet). */}
                {withNode(t("setroom.noShow.goTo", { setup: MARK, button: MARK2 }), <b>{live.station ?? t("setroom.noShow.yourSetup")}</b>, <b>{t("entering.imHere")}</b>)}{" "}
              </>
            ) : null}
            {noShow.overdue ? (
              <b className="text-danger">{isHost ? t("setroom.noShow.overdueHost") : t("setroom.noShow.overdue")}</b>
            ) : (
              withNode(t("setroom.noShow.deadline", { time: MARK }), <b><LocalTime iso={new Date(noShow.deadline).toISOString()} style="time" /></b>)
            )}
          </p>
          <p className="text-muted">{hereText(0)} · {hereText(1)}</p>
          {me && !live.here?.[String(me) as "1" | "2"] && <HereButton setId={set.key} />}
        </div>
      )}
      {waitingFor && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <Icon name="clock" /> {localFeeder(waitingFor.text, t)}{t("common.period")}{" "}
          <span className="text-muted">{waitingFor.live ? t("setroom.feederLive") : t("setroom.feederNext")}</span>
        </p>
      )}
      {/* While the set is being played, the live scoreboard in the set room shows both players: skip this one (saves space on phones). */}
      {!(playable && event.status === "in_progress") && (
        <Scoreboard
          status={set.state === "done" ? "final" : "waiting"}
          left={boardSide(0)}
          right={boardSide(1)}
          winner={set.state === "done" ? set.winner : null}
        />
      )}
      {h2h[0] + h2h[1] > 0 && (
        <p className="text-meta text-muted">
          {t("setroom.h2h")} <b className="text-foreground">{names[0]} {h2h[0]}–{h2h[1]} {names[1]}</b>
        </p>
      )}
      {/* Videos of a finished set (members add them; the stream overlay covers it while it's played). */}
      {set.state === "done" && both && (
        <Suspense fallback={null}>
          <SetVods source="smashy" setId={set.key} userId={userId} />
        </Suspense>
      )}

      {/* Quick reporting: what players reported waits here for the TO, above everything else. */}
      {playable && isHost && event.status === "in_progress" && live.finals && <TOFinalReview setId={set.key} names={[names[0]!, names[1]!]} finals={live.finals} />}

      {playable && walkIn && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <Icon name="user" /> {withNode(t(walkIns.length > 1 ? "setroom.walkIns" : "setroom.walkIn", { name: MARK }), <b>{walkIn}</b>)}
        </p>
      )}
      {playable && me && event.status === "in_progress" && reportFirst && (
        <PlayerFinalReport
          setId={set.key}
          me={me}
          names={[names[0]!, names[1]!]}
          bestOf={set.bestOf}
          mine={live.finals?.[String(me) as "1" | "2"]}
          theirs={live.finals?.[me === 1 ? "2" : "1"]}
        />
      )}
      {playable && event.status === "in_progress" && (
        <SetRoom
          setId={set.key}
          eventId={event.id}
          me={me}
          isHost={isHost}
          names={[names[0]!, names[1]!]}
          // Connect codes are one per player, so a doubles set has none.
          codes={event.teamSize === 2 ? null : me || isHost ? [codeOf(set.p[0].id), codeOf(set.p[1].id)] : [null, null]}
          live={live}
          rules={rules}
          bestOf={set.bestOf}
        />
      )}
      {playable && me && event.status === "in_progress" && !reportFirst && (
        <PlayerFinalReport
          setId={set.key}
          me={me}
          names={[names[0]!, names[1]!]}
          bestOf={set.bestOf}
          mine={live.finals?.[String(me) as "1" | "2"]}
          theirs={live.finals?.[me === 1 ? "2" : "1"]}
        />
      )}
      {playable && me && !isHost && event.status === "in_progress" && <CallHostButton setId={set.key} />}
      {isHost && both && event.status !== "completed" && (
        <p className="text-meta text-muted">
          <Icon name="video" />{" "}
          {withNode(
            t("hostbracket.set.overlay", { overlay: MARK, eventOverlay: MARK2 }),
            <a href={`/host/set/${set.key}/overlay${lang === "en" ? "" : `?lang=${lang}`}`} target="_blank" rel="noopener noreferrer" className="link">{t("hostbracket.set.overlayLink")}<NewTab /></a>,
            <a href={`/host/${event.id}/overlay${lang === "en" ? "" : `?lang=${lang}`}`} target="_blank" rel="noopener noreferrer" className="link">{t("hostbracket.set.eventOverlayLink")}<NewTab /></a>,
          )}
        </p>
      )}
      {isHost && both && event.status !== "completed" && <CopyOverlayLink path={`/host/set/${set.key}/overlay${lang === "en" ? "" : `?lang=${lang}`}`} label={t("hostbracket.set.copyOverlay")} />}
      {playable && event.ruleset && <p className="text-meta text-muted">{withNode(t("setroom.rulesetNote", { ruleset: MARK }), <Link href={`/rulesets/${event.ruleset.id}`} className="link">{event.ruleset.name}</Link>)}</p>}

      {isHost && both && set.state === "done" && (
        <section className="card flex flex-col gap-2 p-4" aria-labelledby="report">
          <h2 id="report" className="font-bold">{t("hostbracket.set.result")}</h2>
          <ReportSet setId={set.key} names={[names[0]!, names[1]!]} bestOf={set.bestOf} done canUndo={canUndo(sets, set.key)} winner={set.winner} later={later} />
        </section>
      )}
      {isHost && playable && (
        <details className="card p-4">
          <summary className="cursor-pointer font-bold">{t("hostbracket.set.direct")}</summary>
          <p className="mt-1 mb-3 text-meta text-muted">{t("hostbracket.set.directHint")}</p>
          <ReportSet setId={set.key} names={[names[0]!, names[1]!]} bestOf={set.bestOf} done={false} canUndo={false} />
        </details>
      )}
    </LangProvider>
  );
}

export default function HostedSetPage(props: PageProps<"/host/set/[id]">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Suspense fallback={<ScoreboardSkeleton />}>
        <HostedSet params={props.params} />
      </Suspense>
    </section>
  );
}
