// A player waiting for their next opponent: "Your next set (Set C): vs Winner of B", with what's
// happening in the set that decides it (feederStatus). Shown on the event page and the live bracket.
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { FeederStatus } from "@/lib/feederStatus";
import { getT } from "@/lib/i18n/server";
import { localFeeder, localRound } from "@/lib/i18n/rounds";

export default async function NextUpCard({
  setId,
  identifier,
  waitingOn,
  feeder,
  className = "",
}: {
  setId: string;
  identifier: string | null;
  waitingOn: string;
  feeder: FeederStatus | null;
  className?: string;
}) {
  const t = await getT();
  return (
    <Link href={`/host/set/${setId}`} className={`card flex items-start gap-3 p-4 hover:bg-surface ${className}`}>
      <Icon name="clock" className="mt-0.5 text-xl text-muted" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-bold">{identifier ? t("event.nextUp.titleSet", { id: identifier, who: localRound(waitingOn, t) }) : t("event.nextUp.title", { who: localRound(waitingOn, t) })}</span>
        <span className="text-meta text-muted">
          {feeder ? `${localFeeder(feeder.text, t)}. ${feeder.live ? t("event.nextUp.stayClose") : t("event.nextUp.notifyYours")}` : t("event.nextUp.notify")}
        </span>
      </span>
    </Link>
  );
}
