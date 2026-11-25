import Link from "next/link";
import { HIGHLIGHT_TYPES, type HighlightType } from "@/lib/highlightTypes";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";

/** The label for each stored highlight type, in the visitor's language. */
export const HIGHLIGHT_TYPE_KEYS: Record<HighlightType, MessageKey> = {
  combo_video: "media.type.combo_video",
  guide: "media.type.guide",
  matchup: "media.type.matchup",
  tech: "media.type.tech",
  frame_data: "media.type.frame_data",
  vod: "media.type.vod",
  other: "media.type.other",
};

/** Filter tabs: All / Guides / Combo videos / … (links, so filters are shareable URLs). */
export default function TypeTabs({ basePath, active, filterLabel }: { basePath: string; active: HighlightType | null; filterLabel?: string }) {
  const tabs: [HighlightType | null, MessageKey][] = [[null, "media.type.all"], ...(Object.keys(HIGHLIGHT_TYPES) as HighlightType[]).map((k): [HighlightType, MessageKey] => [k, HIGHLIGHT_TYPE_KEYS[k]])];
  return (
    <nav aria-label={filterLabel ?? "Filter by type"} className="scroll-fade flex gap-2 overflow-x-auto pr-6 sm:pr-0 sm:[mask-image:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
      {tabs.map(([key, label]) => (
        <Link
          key={label}
          href={key ? `${basePath}?type=${key}` : basePath}
          aria-current={active === key ? "page" : undefined}
          className="chip shrink-0"
        >
          <T k={label} />
        </Link>
      ))}
    </nav>
  );
}

export function parseType(value: unknown): HighlightType | null {
  return typeof value === "string" && value in HIGHLIGHT_TYPES ? (value as HighlightType) : null;
}
