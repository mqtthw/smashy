import LocalTime from "@/components/ui/LocalTime";
import { placeIn } from "@/lib/i18n/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { LiveDot } from "@/components/majors/MajorParts";
import { AlertPermission, AutoRefresh, CalledAlert } from "@/components/mysets/LiveAlerts";
import { getMySets, isActiveSoon, type MyEvent, type MySet } from "@/lib/brackets/startgg";
import { bracketPath, playerName, setPath } from "@/lib/brackets/types";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getMyActiveHostedSets, type MyHostedSet } from "@/lib/hostedEvents";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { scoreLine } from "@/lib/brackets/score";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { Lang } from "@/lib/i18n/core";
import { localRound } from "@/lib/i18n/rounds";
import { signInPath } from "@/lib/returnTo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.mySets"), robots: { index: false } };
}

type Tr = Awaited<ReturnType<typeof getT>>;

const nowSec = () => Math.floor(Date.now() / 1000);


function opponent(s: MySet, t: Tr) {
  const them = s.players[s.me === 0 ? 1 : 0];
  const waiting = s.waitingOn[s.me === 0 ? 1 : 0];
  return them ? playerName(them) : waiting ? localRound(waiting, t) : t("entering.mysets.tbd");
}

function SetRow({ s, t }: { s: MySet; t: Tr }) {
  const mine = s.players[s.me];
  const theirs = s.players[s.me === 0 ? 1 : 0];
  const done = s.state === "done";
  const score = done && mine && theirs ? scoreLine(mine.score, theirs.score) : null;
  const body = (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className={`w-8 shrink-0 text-center text-meta font-bold ${done ? (mine?.won ? "text-success" : "text-danger") : "text-muted"}`}>
        {done ? (mine?.won ? t("entering.mysets.win") : t("entering.mysets.loss")) : "·"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">vs {opponent(s, t)}</span>
        <span className="block truncate text-meta text-muted">{localRound(s.roundLabel, t)}{s.pool ? ` · ${s.pool}` : ""}</span>
      </span>
      {score && <span className="font-mono tabular-nums">{score}</span>}
    </div>
  );
  return /^\d+$/.test(s.id) && theirs ? (
    <Link href={setPath("startgg", s.id)} className="block hover:bg-surface">{body}</Link>
  ) : (
    body
  );
}

function StatusBanner({ ev, t, lang }: { ev: MyEvent; t: Tr; lang: Lang }) {
  const st = ev.status;
  if (st.kind === "up") {
    const where = [
      st.set.station ? t("entering.mysets.station", { station: st.set.station }) : null,
      st.set.stream ? t("entering.mysets.onStream", { stream: st.set.stream }) : null,
    ].filter(Boolean).join(" · ");
    return (
      <div className="flex flex-col gap-1 rounded-xl bg-brand p-4 text-on-brand" role="status">
        <p className="text-title font-bold">{st.set.called ? t("entering.mysets.calledNow") : t("entering.mysets.playingNow")}</p>
        <p>vs {opponent(st.set, t)} · {localRound(st.set.roundLabel, t)}</p>
        {where && <p className="font-semibold">{where}</p>}
      </div>
    );
  }
  if (st.kind === "next") {
    const them = st.set.players[st.set.me === 0 ? 1 : 0];
    return (
      <div className="rounded-xl bg-surface-2 p-4">
        <p className="text-meta font-semibold uppercase tracking-wide text-muted">{t("entering.mysets.next")}</p>
        <p className="text-title font-bold">vs {opponent(st.set, t)}</p>
        <p className="text-meta text-muted">{localRound(st.set.roundLabel, t)}{them ? "" : ` · ${t("entering.mysets.waitingOnSet")}`}</p>
      </div>
    );
  }
  if (st.kind === "waiting") {
    return (
      <div className="rounded-xl bg-surface-2 p-4">
        <p className="font-bold">{st.lastWon ? t("entering.mysets.wonLast") : t("entering.mysets.waitingResults")}</p>
        <p className="text-meta text-muted">{t("entering.mysets.waitingNote")}</p>
      </div>
    );
  }
  if (st.kind === "out") {
    return (
      <div className="rounded-xl bg-surface-2 p-4">
        <p className="font-bold">
          {st.placement ? t("entering.mysets.finished", { place: placeIn(lang, st.placement) }) : t("entering.mysets.done")}
        </p>
        <p className="text-meta text-muted">{t("entering.mysets.ggs")}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-surface-2 p-4">
      <p className="font-bold">{t("entering.mysets.starts")} <LocalTime iso={new Date(ev.startAt * 1000).toISOString()} style="dayDateTime" zone /></p>
      <p className="text-meta text-muted">{t("entering.mysets.showUpLater")}</p>
    </div>
  );
}

function EventCard({ ev, t, lang }: { ev: MyEvent; t: Tr; lang: Lang }) {
  const groupId = ev.sets.at(-1)?.groupId ?? null;
  const bracket = `${bracketPath("startgg", ev.eventId, groupId)}${groupId ? "&" : "?"}q=${encodeURIComponent(ev.myName.split(" | ").at(-1) ?? ev.myName)}`;
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {ev.state === "live" && <LiveDot />}
          {ev.game && <GameBadge game={ev.game} />}
        </div>
        <h2 className="text-title font-bold">{ev.tournamentName}</h2>
        <p className="text-meta text-muted">{ev.eventName} · <LocalTime iso={new Date(ev.startAt * 1000).toISOString()} style="dayDateTime" zone /></p>
      </header>
      <StatusBanner ev={ev} t={t} lang={lang} />
      {ev.sets.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden">
          {ev.sets.map((s) => <SetRow key={s.id} s={s} t={t} />)}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={bracket} className="btn btn-sm btn-outline">{t("entering.mysets.findMe")}</Link>
        <Link href={`/events/${ev.tournamentSlug}`} className="btn btn-sm btn-ghost">{t("entering.mysets.eventPage")}</Link>
      </div>
    </section>
  );
}

/** Your sets in brackets running on Smashy (shown whether or not start.gg is linked). */
function SmashySets({ sets, t }: { sets: MyHostedSet[]; t: Tr }) {
  if (!sets.length) return null;
  return (
    <section className="flex flex-col gap-2 border-b border-line p-4" aria-labelledby="smashy-sets">
      <h2 id="smashy-sets" className="text-title font-bold">{t("entering.mysets.onSmashy")}</h2>
      <ul className="card divide-y divide-line">
        {sets.map((s) => (
          <li key={s.id}>
            <Link href={s.state === "waiting" ? `/host/${s.eventId}` : `/host/set/${s.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-surface">
              <span className={`shrink-0 text-meta font-bold ${s.state === "waiting" ? "text-muted" : "text-brand"}`}>
                {s.state === "live" ? t("entering.mysets.playing") : s.state === "ready" ? t("entering.mysets.youreUp") : t("entering.mysets.next")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">vs {s.opponent ?? t("entering.mysets.tbd")}{s.identifier ? ` · ${t("entering.mysets.setId", { id: s.identifier })}` : ""}</span>
                <span className="block truncate text-meta text-muted">{s.eventName}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function MySets() {
  const [lang, t] = await Promise.all([getLang(), getT()]);
  return (
    <LangProvider lang={lang}>
      <SmashySets sets={await getMyActiveHostedSets(await getUserId()).catch(() => [])} t={t} />
      <StartggSets />
    </LangProvider>
  );
}

async function StartggSets() {
  const [lang, t] = await Promise.all([getLang(), getT()]);
  const userId = await getUserId();
  if (!userId) {
    return (
      <p className="p-6 text-muted">
        <Link href={signInPath("/my-sets")} className="link">{t("entering.mysets.signIn")}</Link> {t("entering.mysets.signInAfter")}
      </p>
    );
  }
  const supabase = await createClient();
  const { data: link } = await supabase.from("startgg_links").select("startgg_user_id, startgg_player_id").eq("user_id", userId).maybeSingle();
  if (!link) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <p>{t("entering.mysets.linkPitch")}</p>
        <Link href="/link/startgg" className="btn btn-md btn-primary self-start">{t("entering.mysets.linkStartgg")}</Link>
      </div>
    );
  }

  const events = await getMySets(Number(link.startgg_user_id), link.startgg_player_id).catch((e) => {
    console.error("My sets failed", e);
    return null;
  });
  if (!events) {
    return (
      <>
        <AutoRefresh />
        <p className="p-6 text-muted">{t("entering.mysets.startggDown")}</p>
      </>
    );
  }
  if (!events.length) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <p className="font-bold">{t("entering.mysets.noEvents")}</p>
        <p className="text-muted">{t("entering.mysets.noEventsNote")}</p>
        <Link href="/events" className="link self-start">{t("entering.mysets.findEvent")}</Link>
      </div>
    );
  }

  const live = events.some((e) => e.state === "live");
  // From 2 hours before a bracket starts, keep checking so the "You're up" alert can fire.
  const watching = events.some((e) => isActiveSoon(e, nowSec()));
  const up = events.find((e) => e.status.kind === "up" && e.status.set.called);
  const upSet = up && up.status.kind === "up" ? up.status.set : null;
  return (
    <>
      {watching && <AutoRefresh />}
      <CalledAlert
        calledKey={upSet ? upSet.id : null}
        text={
          upSet
            ? upSet.station
              ? t("entering.mysets.calledVsAt", { name: opponent(upSet, t), station: upSet.station })
              : t("entering.mysets.calledVs", { name: opponent(upSet, t) })
            : ""
        }
      />
      {watching && (
        <div className="flex flex-col gap-1 border-b border-line px-4 py-3">
          <p className="text-meta text-muted">
            {live ? t("entering.mysets.liveNote") : t("entering.mysets.soonNote")}
          </p>
          <AlertPermission />
        </div>
      )}
      {events.map((ev) => <EventCard key={ev.eventId} ev={ev} t={t} lang={lang} />)}
    </>
  );
}

export default function MySetsPage() {
  return (
    <section>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold"><T k="entering.mysets.title" /></h1>
        <p className="text-meta text-muted"><T k="entering.mysets.intro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={4} label="Loading your sets…" className="p-4" />}>
        <MySets />
      </Suspense>
    </section>
  );
}
