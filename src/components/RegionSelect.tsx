"use client";

import { REGIONS } from "@/lib/regions";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

const GROUPS = ["United States", "Canada", "Countries"] as const;
const GROUP_LABELS: Record<(typeof GROUPS)[number], MessageKey> = { "United States": "people.region.us", Canada: "people.region.canada", Countries: "people.region.countries" };

/** A form field: where you play (US state, Canadian province or country). */
export default function RegionSelect({ defaultValue, className = "field" }: { defaultValue: string; className?: string }) {
  const t = useT();
  return (
    <select name="region" defaultValue={defaultValue} className={className} aria-label={t("people.edit.where")}>
      {GROUPS.map((g) => (
        <optgroup key={g} label={t(GROUP_LABELS[g])}>
          {REGIONS.filter((r) => r.group === g).map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
