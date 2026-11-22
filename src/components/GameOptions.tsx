"use client";

import { GAMES, LEGACY_GAME_KEYS, MAIN_GAME_KEYS } from "@/lib/games";
import { useT } from "@/lib/i18n/client";

/** <option>s for a game dropdown: main games first, older games grouped underneath. */
export default function GameOptions() {
  const t = useT();
  return (
    <>
      {MAIN_GAME_KEYS.map((g) => <option key={g} value={g}>{GAMES[g].short}</option>)}
      <optgroup label={t("people.olderGames")}>
        {LEGACY_GAME_KEYS.map((g) => <option key={g} value={g}>{GAMES[g].short}</option>)}
      </optgroup>
    </>
  );
}
