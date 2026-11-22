// Link preview for a season: its name, game, dates and the top 5, so a scene can post its standings
// anywhere. Read as a signed-out visitor: a teen in the top 5 shows as "A player". Taken-down seasons get
// the generic card.
import { GAMES } from "@/lib/games";
import { clip, GAME_COLOR, MUTED, OG_SIZE, OG_TYPE, Pill, renderOg, siteCard } from "@/lib/ogCard";
import { regionName } from "@/lib/regions";
import { getSeason, getSeasonEvents, getStandings } from "@/lib/seasons";
import { movementMark } from "@/lib/seasonsMath";

export const alt = "A scene's season standings on Smashy";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const season = await getSeason((await params).id).catch(() => null);
  if (!season || season.removed) return siteCard();
  const rows = await getStandings(season, await getSeasonEvents(season.id), null).catch(() => []);
  const top = rows.filter((r) => r.rank !== null).slice(0, 5);
  const sub = [`${day(season.startsOn)} – ${day(season.endsOn)}`, season.region ? regionName(season.region) : null].filter(Boolean).join(" · ");

  return renderOg({
    label: "Season",
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Pill color={GAME_COLOR[season.game]}>{GAMES[season.game].short}</Pill>
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>{sub}</div>
        </div>
        <div style={{ display: "flex", fontSize: season.name.length > 28 ? 56 : 70, color: "#ffffff", letterSpacing: -1, lineHeight: 1.05 }}>{clip(season.name, 60)}</div>
        {top.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {top.map((r) => (
              <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, color: "#d6d9dc" }}>
                <div style={{ display: "flex", width: 56 }}>{MEDAL[r.rank!] ?? `${r.rank}.`}</div>
                <div style={{ display: "flex", flex: 1 }}>{clip(r.hidden ? "A player" : r.name, 28)}</div>
                {movementMark(r.movement) && (
                  <div style={{ display: "flex", fontSize: 24, color: r.movement?.kind === "up" ? "#4ade80" : r.movement?.kind === "down" ? "#f87171" : MUTED }}>{movementMark(r.movement)}</div>
                )}
                <div style={{ display: "flex", color: MUTED }}>{r.points} pts</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 30, color: MUTED }}>Standings coming soon</div>
        )}
      </div>
    ),
  });
}
