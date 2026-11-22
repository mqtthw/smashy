import Link from "next/link";
import { getMySets } from "@/lib/brackets/startgg";
import { playerName } from "@/lib/brackets/types";
import { createClient } from "@/lib/supabase/server";
import { getMyActiveHostedSets } from "@/lib/hostedEvents";
import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";

/**
 * Top-of-feed card while you're in a live event (on Smashy or start.gg): "You're up!" or your next opponent.
 * Shows nothing for guests, unlinked accounts, or when you have no live event.
 */
export default async function MySetsTeaser({ userId }: { userId: string | null }) {
  if (!userId) return null;
  const t = await getT();
  // A bracket running on Smashy comes first (it's right here, and cheap to check).
  const [hosted] = await getMyActiveHostedSets(userId).catch(() => []);
  if (hosted) {
    const up = hosted.state !== "waiting";
    return (
      <Link
        href={up ? `/host/set/${hosted.id}` : `/host/${hosted.eventId}`}
        className={`mx-4 mt-3 flex items-center gap-3 rounded-2xl p-3 ${up ? "bg-brand text-on-brand" : "border border-line hover:bg-surface"}`}
      >
        <Icon name="gamepad" className="text-2xl text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">
            {hosted.state === "live" ? t("entering.mysets.playingNow") : up ? t("play.teaser.strike") : t("play.teaser.next", { name: hosted.opponent ?? t("entering.mysets.tbd") })}
          </span>
          <span className={`block truncate text-meta ${up ? "" : "text-muted"}`}>
            {up ? `${t("play.teaser.vs", { name: hosted.opponent ?? t("entering.mysets.tbd") })}${hosted.identifier ? ` · ${t("entering.mysets.setId", { id: hosted.identifier })}` : ""}` : hosted.eventName}
          </span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
    );
  }
  const supabase = await createClient();
  const { data: link } = await supabase.from("startgg_links").select("startgg_user_id").eq("user_id", userId).maybeSingle();
  if (!link) return null;
  const events = await getMySets(Number(link.startgg_user_id)).catch(() => []);
  const ev = events.find((e) => e.state === "live" && (e.status.kind === "up" || e.status.kind === "next"));
  if (!ev || (ev.status.kind !== "up" && ev.status.kind !== "next")) return null;

  const set = ev.status.set;
  const them = set.players[set.me === 0 ? 1 : 0];
  const vs = them ? playerName(them) : set.waitingOn[set.me === 0 ? 1 : 0] ?? t("entering.mysets.tbd");
  const up = ev.status.kind === "up";
  return (
    <Link
      href="/my-sets"
      className={`mx-4 mt-3 flex items-center gap-3 rounded-2xl p-3 ${up ? "bg-brand text-on-brand" : "border border-line hover:bg-surface"}`}
    >
      <Icon name="gamepad" className="text-2xl text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{up ? (set.called ? t("entering.mysets.calledNow") : t("entering.mysets.playingNow")) : t("play.teaser.next", { name: vs })}</span>
        <span className={`block truncate text-meta ${up ? "" : "text-muted"}`}>
          {up ? `${t("play.teaser.vs", { name: vs })}${set.station ? ` · ${t("entering.mysets.station", { station: set.station })}` : ""}` : `${set.roundLabel} · ${ev.tournamentName}`}
        </span>
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
