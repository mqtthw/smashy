"use client";

import { useRouter } from "next/navigation";
import { bracketPath, type BracketGroup, type BracketSource } from "@/lib/brackets/types";
import { useT } from "@/lib/i18n/client";

/** Switch between pools / phases of the same event. */
export default function GroupPicker({ source, eventId, groups, current, mine = [] }: { source: BracketSource; eventId: string; groups: BracketGroup[]; current: string; mine?: string[] }) {
  const router = useRouter();
  const t = useT();
  if (groups.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-meta">
      <span className="shrink-0 font-semibold">{t("hostbracket.round.poolOnly")}</span>
      <select
        id="bracket-group"
        value={current}
        onChange={(e) => router.push(bracketPath(source, eventId, e.target.value))}
        className="field min-w-0 flex-1 py-1.5"
      >
        {groups.map((g) => <option key={g.id} value={g.id}>{g.label}{mine.includes(g.id) ? t("browse.bracket.you") : ""}</option>)}
      </select>
    </label>
  );
}
