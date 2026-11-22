"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GAME_KEYS, GAMES } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import type { HandMajorInput } from "@/lib/handMajors";
import { addHandMajorAction, updateHandMajorAction } from "../actions";

const BLOCKS = 3; // HAND_GAME_BLOCKS in src/lib/handMajors.ts (server-only, so not imported here)

/**
 * Smash history: a major from before start.gg (1999 to 2016), typed in by hand from a source the
 * admin links (Liquipedia, SmashWiki, the organizer's page). Facts only: never paste wiki text.
 * With `edit`, the same form changes an existing one (its address stays the same).
 */
export default function AddHandMajorForm({ edit }: { edit?: { slug: string; initial: HandMajorInput; blocks: number } }) {
  const t = useT();
  const [state, action, pending] = useActionState(edit ? updateHandMajorAction.bind(null, edit.slug) : addHandMajorAction, {});
  const init = edit?.initial;
  const blocks = edit?.blocks ?? BLOCKS;
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 text-sm">
      <input type="hidden" name="blocks" value={blocks} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">Name<input name="name" required maxLength={120} defaultValue={init?.name} placeholder="Apex 2015" className="field" /></label>
        <label className="flex flex-col gap-1">First day<input name="start" type="date" required min="1999-01-01" max="2016-12-31" defaultValue={init?.start} className="field" /></label>
        <label className="flex flex-col gap-1">Last day (empty for one day)<input name="end" type="date" min="1999-01-01" max="2017-01-31" defaultValue={init?.end} className="field" /></label>
        <label className="flex flex-col gap-1">City<input name="city" maxLength={80} defaultValue={init?.city} placeholder="Secaucus" className="field" /></label>
        <label className="flex flex-col gap-1">Country (two letters; empty for the US)<input name="country" maxLength={2} defaultValue={init?.country} placeholder="JP" className="field uppercase" /></label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          Where the results come from
          <input name="source" type="url" required defaultValue={init?.sourceUrl} placeholder="https://liquipedia.net/smash/Apex/2015" className="field" />
        </label>
      </div>
      {Array.from({ length: blocks }, (_, i) => {
        const g = init?.games[i];
        return (
          <fieldset key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <legend className="px-1 font-semibold">Game {i + 1}{i > 0 ? " (optional)" : ""}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                Game
                <select name={`game${i}`} defaultValue={g?.game ?? ""} className="field">
                  <option value="">—</option>
                  {GAME_KEYS.map((k) => <option key={k} value={k}>{k === "pplus" ? "P+ / Project M" : GAMES[k].short}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Event name<input name={`event${i}`} maxLength={80} defaultValue={g?.eventName} placeholder="Melee Singles" className="field" /></label>
              <label className="flex flex-col gap-1">Entrants<input name={`entrants${i}`} inputMode="numeric" defaultValue={g?.entrants} placeholder="1037" className="field" /></label>
            </div>
            <label className="flex flex-col gap-1">
              Top 8, one per line, 1st first. Start a line with its place to set it (&quot;6 Shroomed&quot;); otherwise places go 1, 2, 3, 4, 5, 5, 7, 7
              <textarea name={`top8_${i}`} rows={8} defaultValue={g?.top8} className="field font-mono" placeholder={"Armada\nHungrybox\nMew2King\nLeffen\n…"} />
            </label>
          </fieldset>
        );
      })}
      <p className="text-meta text-muted">
        Names and placements only, from the linked source; never paste a wiki&apos;s text. Project M brackets go under P+ (keep
        &quot;Project M&quot; in the event name).{edit ? " Emptying a game's box removes that game from the major." : ""}
      </p>
      <button disabled={pending} className="btn btn-md btn-primary self-start">{pending ? "Saving…" : edit ? "Save changes" : "Add to Smash history"}</button>
      {state.error && <p className="text-danger">{t(state.error.key, state.error.values)}</p>}
      {state.ok && state.slug && (
        <p className="text-success">
          {edit ? "Saved." : "Added."} <Link href={`/history/major/${state.slug.replace(/^manual\//, "")}`} className="underline">Open its page</Link>
        </p>
      )}
    </form>
  );
}
