"use client";

import { useActionState, useState } from "react";
import { GAME_KEYS, GAMES } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import { suggestMajor, type SuggestState } from "../actions";

const BLOCKS = 3; // HAND_GAME_BLOCKS in src/lib/handMajors.ts (server-only, so not imported here)

/** Suggest a missing major: a start.gg or parry.gg link (2017 on), or typed-in results with a source (before 2017). */
export default function SuggestForm({ initialKind = "link" }: { initialKind?: "link" | "manual" | "moment" }) {
  const t = useT();
  const [kind, setKind] = useState<"link" | "manual" | "moment">(initialKind);
  const [state, action, pending] = useActionState<SuggestState, FormData>(suggestMajor, {});
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 text-sm">
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" aria-label={t("history.suggest.title")} className="flex flex-wrap gap-2">
        {(["link", "manual", "moment"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`chip py-1 ${kind === k ? "bg-foreground text-background" : ""}`}
          >
            {t(k === "link" ? "history.suggest.modeLink" : k === "manual" ? "history.suggest.modeManual" : "history.suggest.modeMoment")}
          </button>
        ))}
      </div>

      {kind === "moment" ? (
        <>
          <p className="text-muted">{t("history.suggest.momentHint")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">{t("history.suggest.day")}<input name="day" type="date" required min="1999-01-01" className="field" /></label>
            <label className="flex flex-col gap-1">
              {t("history.suggest.pickGame")}
              <select name="momentGame" defaultValue="" className="field">
                <option value="">{t("history.suggest.anyGame")}</option>
                {GAME_KEYS.map((g) => <option key={g} value={g}>{g === "pplus" ? t("history.suggest.pplus") : GAMES[g].short}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">{t("history.suggest.momentTitle")}<input name="title" required minLength={3} maxLength={140} className="field" /></label>
            <label className="flex flex-col gap-1 sm:col-span-2">{t("history.suggest.momentLink")}<input name="momentLink" type="url" required placeholder="https://www.youtube.com/watch?v=…" className="field" /></label>
            <label className="flex flex-col gap-1 sm:col-span-2">{t("history.suggest.momentNote")}<input name="momentNote" maxLength={280} className="field" /></label>
          </div>
        </>
      ) : kind === "link" ? (
        <label className="flex flex-col gap-1">
          {t("history.suggest.linkLabel")}
          <input name="link" type="url" required placeholder="https://www.start.gg/tournament/…" className="field" />
        </label>
      ) : (
        <>
          <p className="text-muted">{t("history.suggest.manualHint")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">{t("history.suggest.name")}<input name="name" required maxLength={120} placeholder="Apex 2015" className="field" /></label>
            <label className="flex flex-col gap-1">{t("history.suggest.start")}<input name="start" type="date" required min="1999-01-01" max="2016-12-31" className="field" /></label>
            <label className="flex flex-col gap-1">{t("history.suggest.end")}<input name="end" type="date" min="1999-01-01" max="2017-01-31" className="field" /></label>
            <label className="flex flex-col gap-1">{t("history.suggest.city")}<input name="city" maxLength={80} className="field" /></label>
            <label className="flex flex-col gap-1">{t("history.suggest.country")}<input name="country" maxLength={2} className="field uppercase" /></label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              {t("history.suggest.source")}
              <input name="source" type="url" required placeholder="https://liquipedia.net/smash/…" className="field" />
            </label>
          </div>
          {Array.from({ length: BLOCKS }, (_, i) => (
            <fieldset key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
              <legend className="px-1 font-semibold">
                {t("history.suggest.game", { n: i + 1 })}{i > 0 ? ` ${t("history.suggest.optional")}` : ""}
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  {t("history.suggest.pickGame")}
                  <select name={`game${i}`} defaultValue="" className="field">
                    <option value="">—</option>
                    {GAME_KEYS.map((g) => <option key={g} value={g}>{g === "pplus" ? t("history.suggest.pplus") : GAMES[g].short}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">{t("history.suggest.eventName")}<input name={`event${i}`} maxLength={80} placeholder="Melee Singles" className="field" /></label>
                <label className="flex flex-col gap-1">{t("history.suggest.entrants")}<input name={`entrants${i}`} inputMode="numeric" className="field" /></label>
              </div>
              <label className="flex flex-col gap-1">
                {t("history.suggest.top8")}
                <textarea name={`top8_${i}`} rows={8} className="field font-mono" />
              </label>
            </fieldset>
          ))}
        </>
      )}

      {kind !== "moment" && (
        <label className="flex flex-col gap-1">
          {t("history.suggest.note")}
          <textarea name="note" rows={2} maxLength={500} className="field" />
        </label>
      )}
      <button disabled={pending} className="btn btn-md btn-primary self-start">{pending ? t("history.suggest.sending") : t("history.suggest.send")}</button>
      <p aria-live="polite">
        {state.error && <span className="text-danger">{t(state.error.key, state.error.values)}</span>}
        {state.ok && <span className="text-success">{t("history.suggest.sent")}</span>}
      </p>
    </form>
  );
}
