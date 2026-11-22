// Melee replay stats on a profile: the summary the member saved from /replays. Self-reported (worked out
// in their own browser), and labelled so. The database decides who may see it.
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { readSavedSummary } from "@/lib/replayProfile";
import { SummaryView } from "./ReplayParts";

export default async function ReplayStatsCard({ summary, shown, isMe }: { summary: unknown; shown: boolean; isMe: boolean }) {
  const s = readSavedSummary(summary);
  if (!s) return null;
  const t = await getT();
  return (
    <section aria-labelledby="replay-card" className="card flex flex-col gap-4 p-4">
      <h2 id="replay-card" className="font-bold">{t("play.replays.card.title")}</h2>
      <SummaryView s={s} listLimit={5} own={isMe} />
      <p className="text-meta text-muted">
        {isMe ? (
          <>
            {!shown && <>{t("play.replays.card.onlyYou")} </>}
            <Link href="/replays" className="link">{t("play.replays.card.update")}</Link>
          </>
        ) : (
          t("play.replays.card.self")
        )}
      </p>
    </section>
  );
}
