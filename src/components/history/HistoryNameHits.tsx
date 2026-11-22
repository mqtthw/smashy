// Search: Smash history's name pages that match (players with no start.gg account, like Smash 4's ZeRo or
// Melee's Azen), so a search finds them even though start.gg doesn't.
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { GAME_KEYS } from "@/lib/games";
import { nameHref, searchHistoryNames } from "@/lib/historyFirsts";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { getNameLinks } from "@/lib/playerLinks";

type Translate = (key: MessageKey, values?: Values) => string;

export default async function HistoryNameHits({ q, t }: { q: string; t: Translate }) {
  const hits = await searchHistoryNames(q, GAME_KEYS, getNameLinks).catch(() => []);
  if (!hits.length) return null;
  return (
    <section aria-labelledby="search-history-names" className="flex flex-col gap-1 px-4">
      <h2 id="search-history-names" className="font-bold">{t("history.name.searchTitle")}</h2>
      <ul className="card divide-y divide-line">
        {hits.map((h) => (
          <li key={h.key}>
            <Link href={nameHref(h.name)} className="flex items-center gap-3 px-4 py-2 hover:bg-surface">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{h.name}</span>
                <span className="block text-meta text-muted">{t("history.name.searchHit", { n: h.placings })}</span>
              </span>
              <span className="flex shrink-0 gap-1">{h.games.map((g) => <GameBadge key={g} game={g} />)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
