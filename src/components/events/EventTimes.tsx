import { formatEventDate, formatEventTime } from "@/lib/format";
import { GAMES, type GameKey } from "@/lib/games";
import { english, type MessageKey, type Values } from "@/lib/i18n/base";

type Tr = (key: MessageKey, values?: Values) => string;

export type EventTime = { name: string; game: GameKey; startAt: number | null; entrants?: number | null };

// Other ways bracket names say the game ("Ult Singles", "PPlus Doubles", "SSBM Singles").
const NICKNAMES: Partial<Record<GameKey, string[]>> = {
  ultimate: ["SSBU", "Smash Ult", "Ult", "Smash Ultimate"],
  melee: ["SSBM"],
  pplus: ["PPlus", "Project+", "Project Plus"],
  smash64: ["SSB64", "64"],
  smash4: ["Smash 4", "Sm4sh", "Wii U"],
};
const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "Singles" -> "Melee Singles" (the game is added when the bracket's name doesn't say it). */
export function bracketName(name: string, game: GameKey): string {
  const g = GAMES[game];
  const words = [g.short, g.name, ...(NICKNAMES[game] ?? [])];
  // Whole words only, so "Ult" matches "Ult Singles" but not "Adult".
  const says = words.some((w) => new RegExp(`(^|[^a-z0-9])${escape(w.toLowerCase())}($|[^a-z0-9])`).test(name.toLowerCase()));
  return says ? name : `${g.short} ${name}`;
}

/** The short time zone name for a venue ("CST", "GMT+1"). */
export function zoneLabel(at: number, timezone: string | null, lang?: string): string {
  return formatEventTime(at, timezone, lang).split(" ").pop() ?? "";
}

/** Brackets in start order: earliest first, unknown times last. */
export function byStart<T extends { startAt: number | null }>(events: T[]): T[] {
  return [...events].sort((a, b) => (a.startAt ?? Infinity) - (b.startAt ?? Infinity));
}

/**
 * When each bracket starts, e.g. "6:00 PM  Melee Doubles · 12" / "7:00 PM  Melee Singles · 40".
 * Times are in the event's own time zone. `showDay` adds the weekday (multi-day events).
 * `t` = the visitor's language (English when not given).
 */
export default function EventTimes({ events, timezone, compact = false, max = 4, t = english, lang }: { events: EventTime[]; timezone: string | null; compact?: boolean; max?: number; t?: Tr; lang?: string }) {
  const sorted = byStart(events);
  if (!sorted.length) return null;
  const days = new Set(sorted.filter((e) => e.startAt).map((e) => formatEventDate(e.startAt!, timezone, lang)));
  const showDay = days.size > 1;
  const shown = sorted.slice(0, max);
  return (
    <ul className={`flex flex-col ${compact ? "gap-0.5 text-meta" : "gap-1 text-sm"}`} aria-label={t("browse.times.label")}>
      {shown.map((e, i) => (
        <li key={`${e.name}-${i}`} className="flex items-baseline gap-2">
          <span className={`shrink-0 font-semibold tabular-nums ${showDay ? (compact ? "w-[6.5rem]" : "w-32") : compact ? "w-[4.75rem]" : "w-24"} whitespace-nowrap ${e.startAt ? "text-foreground" : "text-muted"}`}>
            {e.startAt ? `${showDay ? `${formatEventDate(e.startAt, timezone, lang).split(",")[0]} ` : ""}${formatEventTime(e.startAt, timezone, lang).replace(/\s(GMT[+-][\d:]+|[A-Z]{2,5})$/, "")}` : t("browse.times.tba")}
          </span>
          <span className="min-w-0 truncate text-muted">
            {bracketName(e.name, e.game)}
            {e.entrants ? ` · ${e.entrants}` : ""}
          </span>
        </li>
      ))}
      {sorted.length > max && <li className="text-muted">{t("browse.times.more", { n: sorted.length - max })}</li>}
    </ul>
  );
}
