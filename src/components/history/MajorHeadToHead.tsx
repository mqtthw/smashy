// Head-to-head at majors (Smash history, step H4), on the player compare page: every set two players
// played at the majors Smash history has saved, across years, with the major, round, score and the
// characters each used. Facts only, from start.gg (credited). Both players are already checked as
// allowed to be shown by the compare page.
import Link from "next/link";
import CharacterStocks from "@/components/history/CharacterStocks";
import { scoreLine } from "@/lib/brackets/score";
import { GAMES } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { getMajorHeadToHead } from "@/lib/majorSets";

type Translate = (key: MessageKey, values?: Values) => string;

export default async function MajorHeadToHead({ a, b, aTag, bTag, t }: { a: string; b: string; aTag: string; bTag: string; t: Translate }) {
  const meetings = await getMajorHeadToHead(a, b).catch(() => null);
  if (!meetings) return null; // the database couldn't be read: leave the section out rather than say "never"
  const aWins = meetings.filter((m) => m.aWon).length;
  return (
    <section className="card flex flex-col gap-2 p-4" aria-labelledby="h2h-majors">
      <h2 id="h2h-majors" className="font-bold">{t("history.h2h.title")}</h2>
      {meetings.length ? (
        <>
          <p className="flex items-center justify-center gap-4 text-center">
            <span className="min-w-0 flex-1 truncate text-right font-semibold">{aTag}</span>
            <span className="font-mono text-display font-bold tabular-nums">
              {aWins}–{meetings.length - aWins}
            </span>
            <span className="min-w-0 flex-1 truncate text-left font-semibold">{bTag}</span>
          </p>
          <ul className="divide-y divide-line">
            {meetings.map((m) => (
              <li key={m.setId} className="flex flex-col gap-0.5 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className={`w-20 shrink-0 truncate font-semibold ${m.aWon ? "" : "text-muted"}`}>{m.aWon ? aTag : bTag}</span>
                  <Link href={majorHref(m.majorSlug)} className="min-w-0 flex-1 truncate hover:underline">
                    {m.majorName} <span className="text-muted">({new Date(m.startAt).getUTCFullYear()})</span>
                  </Link>
                  <Link href={`/sets/startgg/${m.setId}`} className="shrink-0 font-mono tabular-nums hover:underline">
                    {scoreLine(m.aScore, m.bScore)}
                  </Link>
                </span>
                <span className="flex items-center gap-2 text-meta text-muted">
                  <span className="min-w-0 flex-1 truncate">
                    {GAMES[m.game].short}
                    {m.round ? ` · ${m.round}` : ""}
                  </span>
                  <CharacterStocks game={m.game} names={m.aChars} />
                  {(m.aChars.length > 0 || m.bChars.length > 0) && <span aria-hidden>vs</span>}
                  <CharacterStocks game={m.game} names={m.bChars} />
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted">{t("history.h2h.none")}</p>
      )}
      <p className="text-meta text-muted">{t("history.h2h.note")}</p>
    </section>
  );
}
