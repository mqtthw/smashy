// Moments in Smash history (step A6): date, what happened (a link to its VOD or source), an optional note
// and game, and who suggested it. Used on each year of /history and on /history/timeline.
import GameBadge from "@/components/GameBadge";
import NewTab from "@/components/ui/NewTab";
import { localeFor, type MessageKey, type Values } from "@/lib/i18n/core";
import type { Moment } from "@/lib/historyMoments";

type Translate = (key: MessageKey, values?: Values) => string;

export function momentDay(day: string, lang: string, monthOnly = false): string {
  // A moment whose day isn't known shows its month alone (The Smash Brothers documentary: October 2013).
  return new Intl.DateTimeFormat(localeFor(lang), monthOnly ? { month: "short", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

export default function MomentList({ moments, lang, t }: { moments: Moment[]; lang: string; t: Translate }) {
  return (
    <ol className="card divide-y divide-line">
      {moments.map((m) => (
        <li key={m.id} className="flex gap-3 px-4 py-2.5">
          <span className="w-14 shrink-0 pt-0.5 text-meta text-muted">{momentDay(m.day, lang, m.monthOnly)}</span>
          <div className="min-w-0 flex-1">
            <a href={m.link} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
              {m.title} ↗<NewTab />
            </a>
            {m.note && <p className="text-sm text-muted">{m.note}</p>}
            {m.suggestedBy && <p className="text-meta text-muted">{t("history.moment.suggestedBy", { handle: m.suggestedBy })}</p>}
          </div>
          {m.game && <GameBadge game={m.game} />}
        </li>
      ))}
    </ol>
  );
}
