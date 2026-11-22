// "In a bracket right now" on a player's page (round 455): which event, still in or out, who they lost
// to, and who's next (or who they're playing now).
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import LiveDot from "@/components/ui/LiveDot";
import { getPlayerLive } from "@/lib/playerLive";
import type { LiveRunSet } from "@/lib/playerLiveSummary";
import { bracketPath, setPath } from "@/lib/brackets/types";
import { getT } from "@/lib/i18n/server";

function Opp({ s }: { s: LiveRunSet }) {
  return s.opp.playerId ? (
    <Link href={`/players/${s.opp.playerId}`} className="font-semibold hover:underline">{s.opp.tag}</Link>
  ) : (
    <b>{s.opp.tag}</b>
  );
}

export default async function PlayerLiveCard({ playerId, tag }: { playerId: string; tag: string }) {
  const live = await getPlayerLive(playerId).catch(() => null);
  if (!live) return null;
  const t = await getT();
  const cur = live.current;
  const groupId = cur?.groupId ?? live.sets.at(-1)?.groupId ?? null;
  const score = (s: LiveRunSet) => (s.me.score !== null && s.opp.score !== null && s.me.score >= 0 && s.opp.score >= 0 ? ` ${s.me.score}–${s.opp.score}` : "");

  let line: React.ReactNode;
  if (cur && live.status === "playing") {
    line = <>{t("people.live.playing")} <Opp s={cur} /> · {cur.round}</>;
  } else if (cur && cur.opp.tag) {
    line = <>{t("people.live.next")} <Opp s={cur} /> · {cur.round}</>;
  } else if (cur) {
    const f = cur.oppFrom;
    const who = f?.a && f?.b
      ? t(f.placement === "loser" ? "people.live.loserOf" : "people.live.winnerOf", { a: f.a, b: f.b })
      : t("people.live.tbd");
    line = <>{t("people.live.next")} {who} · {cur.round}</>;
  } else {
    line = live.status === "out" ? t("people.live.out", { tag }) : t("people.live.waiting");
  }

  return (
    <section className="mx-4 mt-3 rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-meta">
        {live.status !== "out" && <LiveDot />}
        {live.game && <GameBadge game={live.game} />}
        <span className="font-semibold">{live.tournamentName}</span>
        <span className="text-muted">· {live.eventName}</span>
      </div>
      <p className="mt-1.5">
        {live.status === "out" ? <span className="text-muted">{line}</span> : line}
        {cur && (
          <>
            {" "}
            <Link href={setPath("startgg", cur.id)} className="link text-meta" prefetch={false}>{t("people.live.openSet")}</Link>
          </>
        )}
      </p>
      <p className="mt-1 text-meta text-muted">
        {t("people.live.record", { wins: live.wins, losses: live.losses.length })}
        {live.losses.length > 0 && (
          <>
            {" · "}
            {t("people.live.lostTo")}{" "}
            {live.losses.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                <Link href={setPath("startgg", s.id)} className="hover:underline">{s.opp.tag}{score(s)}</Link>
              </span>
            ))}
          </>
        )}
      </p>
      <Link href={bracketPath("startgg", live.eventId, groupId)} className="btn btn-sm btn-outline mt-2">{t("people.live.bracket")}</Link>
    </section>
  );
}
