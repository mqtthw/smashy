// Link preview for a set in a bracket hosted on Smashy: a scoreboard (both players, the score, who
// won), the round and the event. A link-preview bot isn't signed in, so names come from the same
// guest-safe read as the page (players hidden from guests show as "Player"). Removed events and
// unknown sets get the generic card.
import { GAMES } from "@/lib/games";
import { bracketPlayers, loadEngineSets, toBracket } from "@/lib/hostedBracket";
import { getHostedEvent } from "@/lib/hostedEvents";
import { BRAND, clip, GAME_COLOR, LINE, MUTED, OG_SIZE, OG_TYPE, renderOg, siteCard, SURFACE } from "@/lib/ogCard";
import { isUuid } from "@/lib/siteMeta";
import { scoreText } from "@/lib/brackets/score";
import { liveScore, type LiveState } from "@/lib/liveSet";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";

export const alt = "A set on Smashy";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

function Row({ name, score, won, dim }: { name: string; score: string | null; won: boolean; dim: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "18px 32px", background: SURFACE, borderRadius: 20, border: `2px solid ${won ? BRAND : LINE}` }}>
      <div style={{ display: "flex", flex: 1, fontSize: 52, color: dim ? MUTED : "#ffffff" }}>{clip(name, 26)}</div>
      {score !== null && <div style={{ display: "flex", fontSize: 60, color: dim ? MUTED : "#ffffff", minWidth: 60, justifyContent: "flex-end" }}>{score}</div>}
    </div>
  );
}

/** Everything the card shows, or null for the generic card. Loading errors fall back too. */
async function load(id: string) {
  try {
    // Always read as a guest, whoever asks: this image is cached and shown outside Smashy.
    const guest = createGuestClient();
    const { data: row } = await guest.from("hosted_sets").select("event_id, live").eq("id", id).maybeSingle();
    const event = row ? await getHostedEvent(row.event_id as string, guest) : null;
    if (!event || event.removed) return null;
    const [sets, players] = await Promise.all([loadEngineSets(event.id, guest), bracketPlayers(event.id, guest)]);
    const set = sets.find((s) => s.key === id);
    if (!set) return null;
    const shown = toBracket(event, sets, players, set.pool).rounds.flatMap((r) => r.sets).find((s) => s.id === id);
    const done = set.state === "done";
    const live = (row?.live as LiveState | null)?.games ? liveScore(row!.live as LiveState) : [0, 0];
    const rows = ([0, 1] as const).map((i) => ({
      name: set.p[i].id ? (players.get(set.p[i].id!)?.tag ?? "Player") : (shown?.waitingOn[i] ?? "TBD"),
      // While it's played, games won so far (the final score is only saved at the end).
      score: done ? scoreText(set.score[i], set.score[1 - i], "0") : set.state === "live" ? String(live[i]) : null,
      won: done && set.winner === i + 1,
      dim: done && set.winner !== i + 1,
    }));
    const state = set.state === "live" ? "Live" : set.state === "ready" ? "Up next" : done ? null : "Upcoming";
    return {
      label: [GAMES[event.game].short, state ?? "Set"].join(" · "),
      accent: GAME_COLOR[event.game] ?? BRAND,
      heading: `${shown?.roundLabel ?? `Set ${set.identifier ?? ""}`} · ${event.name}`,
      rows,
      bestOf: set.bestOf,
    };
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = isUuid(id) && hasSupabase() ? await load(id) : null;
  if (!card) return siteCard();
  return renderOg({
    label: card.label,
    accent: card.accent,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", fontSize: 34, color: MUTED }}>{clip(card.heading, 60)}</div>
        {card.rows.map((r, i) => (
          <Row key={i} {...r} />
        ))}
        <div style={{ display: "flex", fontSize: 28, color: MUTED }}>Best of {card.bestOf} · Follow it live on Smashy</div>
      </div>
    ),
  });
}
