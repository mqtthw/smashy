// Small pieces the season pages share: dates in the reader's language, and a region menu with "none".
import { localeFor, type Lang } from "@/lib/i18n/core";
import { REGIONS } from "@/lib/regions";

/** "Sep 1, 2026" in the reader's language (dates are plain calendar days). */
export function dayLabel(day: string, lang: Lang): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(localeFor(lang), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export const dayRange = (from: string, to: string, lang: Lang) => `${dayLabel(from, lang)} – ${dayLabel(to, lang)}`;

/** Where the scene is (optional): a US state, Canadian province or country. */
export function RegionField({ defaultValue, noneLabel, label }: { defaultValue: string | null; noneLabel: string; label: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      <select name="region" defaultValue={defaultValue ?? ""} className="field">
        <option value="">{noneLabel}</option>
        {(["United States", "Canada", "Countries"] as const).map((g) => (
          <optgroup key={g} label={g}>
            {REGIONS.filter((r) => r.group === g).map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
