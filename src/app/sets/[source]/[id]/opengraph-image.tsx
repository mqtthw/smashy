// Link preview for a set: a scoreboard (both players, the score, who won), the round and tournament.
// Bracket data is public (it comes from start.gg / parry.gg), and getSet is cached.
import { getSet, isSource } from "@/lib/brackets";
import type { SetDetail, SetPlayer } from "@/lib/brackets/types";
import { GAMES } from "@/lib/games";
import { BRAND, clip, GAME_COLOR, LINE, MUTED, OG_SIZE, OG_TYPE, renderOg, siteCard, SURFACE } from "@/lib/ogCard";
import { scoreText } from "@/lib/brackets/score";

export const alt = "A set on Smashy";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

function Row({ p, other, waiting, set }: { p: SetPlayer | null; other: SetPlayer | null; waiting: string | null; set: SetDetail }) {
  const done = set.state === "done";
  const dim = done && p && !p.won;
  const score = p ? scoreText(p.score, other?.score) || null : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "18px 32px", background: SURFACE, borderRadius: 20, border: `2px solid ${p?.won ? BRAND : LINE}` }}>
      <div style={{ display: "flex", flex: 1, alignItems: "baseline", gap: 16, minWidth: 0 }}>
        {p?.prefix && <div style={{ display: "flex", fontSize: 32, color: MUTED }}>{clip(p.prefix, 14)}</div>}
        <div style={{ display: "flex", fontSize: 52, color: dim ? MUTED : "#ffffff" }}>{p ? clip(p.name, 22) : clip(waiting ?? "TBD", 30)}</div>
      </div>
      {(set.state !== "pending" || score !== null) && (
        <div style={{ display: "flex", fontSize: 60, color: dim ? MUTED : "#ffffff", minWidth: 60, justifyContent: "flex-end" }}>{score ?? "–"}</div>
      )}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ source: string; id: string }> }) {
  const { source, id } = await params;
  if (!isSource(source)) return siteCard();
  const set = await getSet(source, decodeURIComponent(id)).catch(() => null);
  if (!set) return siteCard();

  const game = set.event.game;
  const state = set.state === "live" ? "Live" : set.state === "pending" ? "Upcoming" : null;
  return renderOg({
    label: [game ? GAMES[game].short : null, state ?? "Set"].filter(Boolean).join(" · "),
    accent: game ? GAME_COLOR[game] : BRAND,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", fontSize: 34, color: MUTED }}>{clip(`${set.roundLabel} · ${set.event.tournamentName}`, 60)}</div>
        <Row p={set.players[0]} other={set.players[1]} waiting={set.waitingOn[0]} set={set} />
        <Row p={set.players[1]} other={set.players[0]} waiting={set.waitingOn[1]} set={set} />
        <div style={{ display: "flex", fontSize: 28, color: MUTED }}>{clip(set.event.eventName, 60)} · Discuss it on Smashy</div>
      </div>
    ),
  });
}
