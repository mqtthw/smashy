"use client";

import { useState, useTransition } from "react";
import { attachRuleset } from "@/app/scenes/actions";
import { GAMES, type GameKey } from "@/lib/games";
import { useT } from "@/lib/i18n/client";

type Option = { id: string; name: string; game: GameKey };

/** For scene admins: attach one of their rulesets to this event, or to every week of its series. */
export default function AttachRulesetForm({
  options,
  tournamentSlug,
  seriesId,
  seriesName,
}: {
  options: Option[];
  tournamentSlug?: string;
  seriesId?: string | null;
  seriesName?: string;
}) {
  const t = useT();
  const [rulesetId, setRulesetId] = useState(options[0]?.id ?? "");
  const [scope, setScope] = useState<"series" | "tournament">(seriesId ? "series" : "tournament");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!options.length) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface p-3 text-sm">
      <p className="font-semibold">{t("media.rs.attachTitle")}</p>
      <select value={rulesetId} onChange={(e) => setRulesetId(e.target.value)} className="field px-2 py-1">
        {options.map((o) => (
          <option key={o.id} value={o.id}>{GAMES[o.game].short}: {o.name}</option>
        ))}
      </select>
      <div className="flex flex-col gap-1">
        {seriesId && (
          <label className="flex items-center gap-2">
            <input type="radio" checked={scope === "series"} onChange={() => setScope("series")} />
            {t("media.rs.everyWeek", { name: seriesName ?? t("media.rs.thisWeekly") })}
          </label>
        )}
        {tournamentSlug && (
          <label className="flex items-center gap-2">
            <input type="radio" checked={scope === "tournament"} onChange={() => setScope("tournament")} />
            {t("media.rs.thisEventOnly")}
          </label>
        )}
      </div>
      {error && <p className="text-danger">{error}</p>}
      <button
        type="button"
        disabled={pending || !rulesetId}
        onClick={() =>
          startTransition(async () => {
            const key = scope === "series" ? seriesId : tournamentSlug;
            if (!key) return;
            const res = await attachRuleset(rulesetId, scope, key);
            setError(res.error ?? null);
          })
        }
        className="self-start btn btn-sm btn-inverse"
      >
        {pending ? t("media.rs.attaching") : t("media.rs.attach")}
      </button>
    </div>
  );
}
