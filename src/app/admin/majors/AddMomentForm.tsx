"use client";

import { useActionState } from "react";
import { GAME_KEYS, GAMES } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import { addMomentAction } from "../actions";

/** Smash history: add a moment to the timeline (a date, what happened, a VOD or source link). */
export default function AddMomentForm() {
  const t = useT();
  const [state, action, pending] = useActionState(addMomentAction, {});
  return (
    <form action={action} className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
      <label className="flex flex-col gap-1">Date<input name="day" type="date" required min="1999-01-01" className="field" /></label>
      <label className="flex flex-col gap-1">
        Game
        <select name="game" defaultValue="" className="field">
          <option value="">No particular game</option>
          {GAME_KEYS.map((g) => <option key={g} value={g}>{g === "pplus" ? "P+ / Project M" : GAMES[g].short}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">What happened (plain facts, no &quot;greatest ever&quot;)<input name="title" required minLength={3} maxLength={140} placeholder="Super Smash Bros. Melee comes out in Japan" className="field" /></label>
      <label className="flex flex-col gap-1 sm:col-span-2">VOD or source link<input name="link" type="url" required className="field" /></label>
      <label className="flex flex-col gap-1 sm:col-span-2">Short note (optional)<input name="note" maxLength={280} className="field" /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn btn-md btn-primary">{pending ? "Saving…" : "Add moment"}</button>
        {state.error && <p className="text-danger">{t(state.error.key, state.error.values)}</p>}
        {state.ok && <p className="text-success">Added.</p>}
      </div>
    </form>
  );
}
