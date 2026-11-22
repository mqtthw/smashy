"use client";

import { useActionState } from "react";
import { GAMES, isGameKey } from "@/lib/games";
import { linkNameAction, linkSuggestedAction } from "../../actions";

/** Link one name: a suggested player (a button), or a pasted start.gg player id / Smashy player page link. */
export default function LinkNameForm({ name, games, suggestions }: { name: string; games: string[]; suggestions: { playerId: string; tag: string; atMajor: boolean }[] }) {
  const [state, action, pending] = useActionState(linkNameAction.bind(null, name, null), {});
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <form key={s.playerId} action={linkSuggestedAction.bind(null, name, s.playerId)}>
            <button className={`btn btn-sm ${s.atMajor ? "btn-primary" : "btn-ghost"}`} title={s.atMajor ? "Placed at a major under this name" : "Only on start.gg with this tag: check it's the same person"}>
              Link to {s.tag} <span className="font-normal opacity-80">({s.atMajor ? "seen at a major" : "start.gg only, check"} · {s.playerId})</span>
            </button>
          </form>
        ))}
        <a href={`/search?q=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">Find a player ↗</a>
      </div>
      <form action={action} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`player-${name}`}>start.gg player id or Smashy player page</label>
        <input id={`player-${name}`} name="player" placeholder="Player id or smashy.gg/players/… link" className="field min-w-0 flex-1 text-sm" />
        {games.length > 1 && (
          <select name="game" aria-label="In which game" defaultValue="" className="field text-sm">
            <option value="">In every game</option>
            {games.filter(isGameKey).map((g) => (
              <option key={g} value={g}>Only in {GAMES[g].short}</option>
            ))}
          </select>
        )}
        <button disabled={pending} className="btn btn-sm btn-outline">{pending ? "Linking…" : "Link"}</button>
        {state.error && <p className="w-full text-sm text-danger">{state.error}</p>}
      </form>
    </div>
  );
}
