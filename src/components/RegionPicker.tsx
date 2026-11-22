"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { REGIONS } from "@/lib/regions";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

const GROUPS = ["United States", "Canada", "Countries"] as const;
const GROUP_LABELS: Record<(typeof GROUPS)[number], MessageKey> = { "United States": "people.region.us", Canada: "people.region.canada", Countries: "people.region.countries" };

/** A region menu (US states, Canadian provinces, countries) that opens `path?region=...`, showing it's loading. */
export default function RegionPicker({ current, path, label: labelProp }: { current: string; path: string; label?: string }) {
  const t = useT();
  const label = labelProp ?? t("people.region");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(current);
  return (
    <label className="flex items-center gap-1.5 text-sm text-muted">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={shown}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => {
            setShown(next);
            router.push(`${path}?region=${encodeURIComponent(next)}`);
          });
        }}
        className="max-w-48 rounded-full border border-line bg-field px-3 py-1 text-sm font-semibold text-foreground"
        aria-label={label}
        aria-busy={pending}
      >
        {GROUPS.map((g) => (
          <optgroup key={g} label={t(GROUP_LABELS[g])}>
            {REGIONS.filter((r) => r.group === g).map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {pending && <span className="animate-pulse text-meta" role="status">{t("people.history.loading")}</span>}
    </label>
  );
}
