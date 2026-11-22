// Top 8 VODs of a major, as links to where they play ("▶ Melee top 8 · YouTube playlist").
import NewTab from "@/components/ui/NewTab";
import { GAMES } from "@/lib/games";
import type { MessageKey, Values } from "@/lib/i18n/core";
import type { MajorVod } from "@/lib/majorVods";

type Translate = (key: MessageKey, values?: Values) => string;

export default function VodLinks({ vods, t, className = "" }: { vods: MajorVod[]; t: Translate; className?: string }) {
  if (!vods.length) return null;
  return (
    <p className={`flex flex-wrap gap-x-3 gap-y-1 text-meta ${className}`}>
      {vods.map((v) => (
        <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="link">
          ▶ {v.label || t("history.vod.defaultLabel", { game: GAMES[v.game].short })}
          <span className="text-muted"> · {v.provider}</span>
          <NewTab />
        </a>
      ))}
    </p>
  );
}
