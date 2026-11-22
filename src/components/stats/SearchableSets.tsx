"use client";
// A player's recent sets with a search box: by opponent, a character either side played, or the tournament.
import { useState } from "react";
import { RecentSetsCard } from "@/components/stats/StatsCards";
import { filterSets } from "@/lib/playerResults";
import type { PlayerSet } from "@/lib/playerStats";
import { useT } from "@/lib/i18n/client";

export default function SearchableSets({ sets }: { sets: PlayerSet[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const shown = filterSets(sets, query);
  return (
    <RecentSetsCard sets={shown} total={sets.length} initial={query.trim() ? sets.length : 15}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("people.sets.searchPlaceholder")}
        aria-label={t("people.sets.searchAria")}
        className="field my-1 w-full py-1.5"
      />
      {query.trim() && !shown.length && <p className="py-2 text-sm text-muted">{t("people.sets.noMatch", { q: query.trim() })}</p>}
    </RecentSetsCard>
  );
}
