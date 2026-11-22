"use client";

import { useOptimistic, useTransition } from "react";
import { setShowStats } from "./actions";
import { useT } from "@/lib/i18n/client";

/** On/off switch: show my start.gg stats (record, characters, rivals) on my profile. */
export default function StatsToggle({ on }: { on: boolean }) {
  const t = useT();
  const [value, setValue] = useOptimistic(on);
  const [, startTransition] = useTransition();
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-semibold">{t("people.showStats.title")}</span>
        <span className="block text-meta text-muted">{t("people.showStats.body")}</span>
      </span>
      <input
        id="show-stats"
        type="checkbox"
        role="switch"
        checked={value}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setValue(next);
            await setShowStats(next);
          });
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}
