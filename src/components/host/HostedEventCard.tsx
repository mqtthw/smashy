import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import type { HostedEventCard as Card } from "@/lib/posts";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";

const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * A hosted event on a post. It always shows the event as it is now: sign-ups while open, "Live now"
 * while the bracket runs, and the top 3 when it's over.
 */
export default function HostedEventCard({ e }: { e: Card }) {
  const label: MessageKey =
    e.status === "completed" ? "hostsetup.card.results" : e.status === "in_progress" ? "event.status.liveNow" : e.status === "canceled" ? "event.status.canceled" : e.signupsOpen ? "event.status.open" : "event.status.closed";
  return (
    <Link href={`/host/${e.id}`} className="mt-2 flex flex-col gap-1.5 rounded-xl border border-line p-3 hover:bg-surface">
      <span className="flex flex-wrap items-center gap-1.5 text-meta">
        {e.game !== "general" && <GameBadge game={e.game} />}
        <span className={`font-semibold ${e.status === "in_progress" ? "text-brand" : "text-muted"}`}>{e.status === "in_progress" && "● "}<T k={label} /></span>
        <span className="text-muted">· <Icon name={e.online ? "globe" : "pin"} /> {e.online ? <><T k="event.online" />{e.where ? ` · ${e.where}` : ""}</> : (e.where ?? <T k="event.inPerson" />)}</span>
      </span>
      <span className="font-bold leading-snug">{e.name}</span>
      {e.status === "completed" && e.podium.length > 0 ? (
        <ol className="flex flex-col text-sm">
          {e.podium.map((p) => (
            <li key={`${p.place}-${p.tag}`}>{MEDAL[p.place - 1] ?? `${p.place}.`} {p.tag ?? <span className="text-muted"><T k="season.hiddenPlayer" /></span>}</li>
          ))}
        </ol>
      ) : (
        <span className="text-meta text-muted">
          <LocalTime iso={e.startsAt} style="dayDateTime" /> · <T k="hostsetup.card.players" values={{ players: e.players, cap: e.cap }} />
          {e.signupsOpen && <b className="ml-1 text-brand"><T k="event.signUpArrow" /></b>}
        </span>
      )}
    </Link>
  );
}
