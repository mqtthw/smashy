"use client";

import { useActionState } from "react";
import { GAMES, type GameKey } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import { addMajorVodAction } from "../actions";

export type VodMajorOption = { slug: string; name: string; games: GameKey[] };

/** Add a top 8 VOD: pick the major and its game, paste the link, and an optional label. */
export default function VodForm({ majors, selected }: { majors: VodMajorOption[]; selected: string | null }) {
  const t = useT();
  const [state, action, pending] = useActionState(addMajorVodAction, {});
  const games = [...new Set(majors.flatMap((m) => m.games))];
  if (state.ok) return <p className="card p-4 text-sm text-success" aria-live="polite">{t(state.approved ? "history.vod.added" : "history.vod.sent")}</p>;
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 text-sm">
      <label className="flex flex-col gap-1">
        {t("history.vod.major")}
        <select name="major" required defaultValue={selected ?? ""} className="field">
          <option value="" disabled>—</option>
          {majors.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t("history.suggest.pickGame")}
        <select name="game" required defaultValue={games.length === 1 ? games[0] : ""} className="field">
          <option value="" disabled>—</option>
          {games.map((g) => <option key={g} value={g}>{g === "pplus" ? t("history.suggest.pplus") : GAMES[g].short}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t("history.vod.url")}
        <input name="url" type="url" required placeholder="https://www.youtube.com/playlist?list=…" className="field" />
      </label>
      <label className="flex flex-col gap-1">
        {t("history.vod.label")}
        <input name="label" maxLength={80} placeholder={t("history.vod.labelHint")} className="field" />
      </label>
      <button disabled={pending} className="btn btn-md btn-primary self-start">{pending ? t("history.suggest.sending") : t("history.vod.send")}</button>
      <p aria-live="polite">{state.error && <span className="text-danger">{t(state.error.key, state.error.values)}</span>}</p>
    </form>
  );
}
