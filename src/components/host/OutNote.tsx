// A player knocked out of a running bracket: "🏁 You're out. GGs!", where their placement will show,
// and (online events) a way to keep playing. On the event page and the live bracket.
import Link from "next/link";
import type { GameKey } from "@/lib/games";
import { getT } from "@/lib/i18n/server";

export default async function OutNote({ eventId, game, online, onBracket = false, className = "" }: { eventId: string; game: GameKey; online: boolean; onBracket?: boolean; className?: string }) {
  const t = await getT();
  return (
    <p className={`card p-4 text-sm ${className}`}>
      <b>{t("event.out.title")}</b>{" "}
      <span className="text-muted">
        {onBracket ? (
          <>
            {t("event.out.onBracketBefore")} <Link href={`/host/${eventId}`} className="link">{t("event.out.onBracketLink")}</Link> {t("event.out.onBracketAfter")}
          </>
        ) : (
          t("event.out.here")
        )}
      </span>
      {online && (
        <>
          {" "}
          <Link href={`/play?room=${game}`} className="link">{t("event.out.play")}</Link>{t("common.period")}
        </>
      )}
    </p>
  );
}
