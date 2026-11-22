// A character page's top 8s by year: in how many of each year's known major top 8 placings the character was
// played (src/lib/historyFirsts.ts characterByYear), as a bar per year. Only years where most placings' characters
// are known; a count of what was played, not a judgement of how strong the character was.
import Link from "next/link";
import type { GameKey } from "@/lib/games";
import { characterByYear, top8Characters } from "@/lib/historyFirsts";
import type { MessageKey, Values } from "@/lib/i18n/core";

type Translate = (key: MessageKey, values?: Values) => string;

export default async function CharacterYears({ game, character, name, t }: { game: GameKey; character: string; name: string; t: Translate }) {
  const majors = await top8Characters(game).catch(() => null);
  if (!majors) return null;
  const years = characterByYear(majors, character);
  if (!years.some((y) => y.n > 0)) return null;

  return (
    <section aria-labelledby="character-years" className="card flex flex-col gap-2 p-4">
      <h2 id="character-years" className="font-bold">{t("history.charYears.title", { name })}</h2>
      <ol className="flex flex-col gap-1 text-sm">
        {years.map((y) => {
          const share = y.n / y.known;
          return (
            <li key={y.year} className="flex items-center gap-3">
              <Link href={`/history?year=${y.year}&game=${game}`} className="w-10 shrink-0 tabular-nums hover:underline">{y.year}</Link>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden>
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round(share * 100)}%` }} />
              </span>
              <span className="w-24 shrink-0 text-right tabular-nums text-muted">{t("history.charYears.count", { n: y.n, total: y.known })}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-meta text-muted">{t("history.charYears.note", { name })}</p>
    </section>
  );
}
