// The scoreboard: the dark panel that is a set. Two players, a big score between them you can read
// at arm's length, and a status pill. Used on the set page, in the live set room, on a player's
// "your set" card, in the stage striker and in the demo, so a set looks the same everywhere.
// It sits on a "board" (globals.css): a dark island where the ordinary color classes (text-muted,
// btn-inverse, btn-outline…) take their dark values, in both themes.
import type { ReactNode } from "react";
import LiveDot from "@/components/ui/LiveDot";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";

export type BoardStatus = "live" | "ready" | "reported" | "waiting" | "final";

const QUIET = "ring-1 ring-inset ring-line-strong text-muted";
const PILL: Record<Exclude<BoardStatus, "live">, { text: MessageKey; tone: string }> = {
  ready: { text: "event.board.ready", tone: "bg-foreground text-background" },
  reported: { text: "event.board.reported", tone: "ring-1 ring-inset ring-line-strong" },
  waiting: { text: "event.board.waiting", tone: QUIET },
  final: { text: "event.board.final", tone: QUIET },
};

/** The small status label on a board: "LIVE" (the pulsing badge), "Ready", "Final"… `children` replaces the word. */
export function BoardPill({ status, children }: { status: BoardStatus; children?: ReactNode }) {
  if (status === "live") return <LiveDot>{children}</LiveDot>;
  return <span className={`badge shrink-0 ${PILL[status].tone}`}>{children ?? <T k={PILL[status].text} />}</span>;
}

export type BoardSide = {
  name: ReactNode;
  /** Games won, or a short word like "DQ" or "W". Leave both sides out to show "vs". */
  score?: number | string | null;
  /** Shown above the name (an avatar). */
  top?: ReactNode;
};

export default function Scoreboard({
  label,
  status,
  statusText,
  left,
  right,
  winner = null,
  children,
  className = "",
}: {
  /** Small line above the players: "Set C · Best of 3". */
  label?: ReactNode;
  status: BoardStatus;
  statusText?: ReactNode;
  left: BoardSide;
  right: BoardSide;
  /** Once it's over: the other side is dimmed. */
  winner?: 1 | 2 | null;
  /** Under the players: where it's played, the next thing to do. */
  children?: ReactNode;
  className?: string;
}) {
  const scored = left.score != null && right.score != null;
  const digits = typeof left.score === "number" && typeof right.score === "number";
  const dim = (slot: 1 | 2) => (winner && winner !== slot ? "text-muted" : "");
  const side = (s: BoardSide, slot: 1 | 2) => (
    <div className={`flex min-w-0 flex-col gap-1.5 ${slot === 1 ? "items-start" : "items-end text-right"} ${dim(slot)}`}>
      {s.top && <span className={winner && winner !== slot ? "opacity-60" : ""}>{s.top}</span>}
      {/* max-w-full + wrap-anywhere: a 30-letter tag with no spaces wraps inside its column instead of running over the score. */}
      <span className="line-clamp-2 max-w-full text-lg font-bold leading-tight wrap-anywhere">{s.name}</span>
    </div>
  );
  return (
    <div className={`board flex flex-col gap-3 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-meta text-muted">
        <span className="min-w-0 truncate">{label}</span>
        <BoardPill status={status}>{statusText}</BoardPill>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        {side(left, 1)}
        {scored ? (
          <span className={`whitespace-nowrap font-mono font-bold leading-none tabular-nums ${digits ? "text-4xl" : "text-2xl"}`}>
            <span className={dim(1)}>{left.score}</span>
            <span className="px-1 text-muted">–</span>
            <span className={dim(2)}>{right.score}</span>
          </span>
        ) : (
          <span className="text-sm font-semibold text-muted">vs</span>
        )}
        {side(right, 2)}
      </div>
      {children}
    </div>
  );
}
