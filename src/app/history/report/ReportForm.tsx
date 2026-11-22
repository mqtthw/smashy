"use client";

import { useActionState } from "react";
import { useT } from "@/lib/i18n/client";
import { reportMistakeAction, type SuggestState } from "../actions";

export type ReportOption = { value: string; label: string; group: "majors" | "moments" };

/**
 * Report a mistake: pick the major or moment, say what's wrong, add a source if there is one.
 * `fill`: the text to start from when filling in a game's missing top 8 ("Melee top 8: 1 …").
 */
export default function ReportForm({ options, selected, fill = null }: { options: ReportOption[]; selected: string | null; fill?: string | null }) {
  const t = useT();
  const [state, action, pending] = useActionState<SuggestState, FormData>(reportMistakeAction, {});
  const majors = options.filter((o) => o.group === "majors");
  const moments = options.filter((o) => o.group === "moments");
  if (state.ok) return <p className="card p-4 text-sm text-success" aria-live="polite">{t("history.report.sent")}</p>;
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 text-sm">
      <label className="flex flex-col gap-1">
        {t("history.report.what")}
        <select name="target" required defaultValue={selected ?? ""} className="field">
          <option value="" disabled>—</option>
          {majors.length > 0 && (
            <optgroup label={t("history.report.majors")}>
              {majors.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          )}
          {moments.length > 0 && (
            <optgroup label={t("history.report.moments")}>
              {moments.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          )}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t("history.report.message")}
        <textarea name="message" required minLength={5} maxLength={500} rows={fill ? 10 : 3} defaultValue={fill ?? undefined} placeholder={t("history.report.messageHint")} className="field" />
      </label>
      <label className="flex flex-col gap-1">
        {t("history.report.link")}
        <input name="link" type="url" placeholder="https://…" className="field" />
      </label>
      <button disabled={pending} className="btn btn-md btn-primary self-start">{pending ? t("history.suggest.sending") : t("history.report.send")}</button>
      <p aria-live="polite">{state.error && <span className="text-danger">{t(state.error.key, state.error.values)}</span>}</p>
    </form>
  );
}
