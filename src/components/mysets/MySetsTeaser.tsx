import Link from "next/link";
import { getMySets } from "@/lib/brackets/startgg";
import { playerName } from "@/lib/brackets/types";
import { createClient } from "@/lib/supabase/server";
import { getMyActiveHostedSets } from "@/lib/hostedEvents";
import DismissableTeaser from "./DismissableTeaser";
import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";

/**
 * Top-of-feed card while you're in a live event (on Smashy or start.gg): "You're up!" or your next opponent.
 * Shows nothing for guests, unlinked accounts, or when you have no live event. Round 916: "You're up" is a
 * gold bar with a red edge that glows (gold is the skin's colour for what needs you), and either bar can be
 * closed for that set (DismissableTeaser).
 */
export default async function MySetsTeaser({ userId }: { userId: string | null }) {
  if (!userId) return null;
  const t = await getT();
  // A bracket running on Smashy comes first (it's right here, and cheap to check).
  const [hosted] = await getMyActiveHostedSets(userId).catch(() => []);
  if (hosted) {
    const up = hosted.state !== "waiting";
    return (
      <DismissableTeaser id={`h:${hosted.id}:${hosted.state}`} label={t("ui.dismiss")} glow={up}>
      <Link
        href={up ? `/host/set/${hosted.id}` : `/host/${hosted.eventId}`}
        className={`flex items-center gap-3 py-2.5 pr-12 pl-4 ${up ? "banner-up teaser-up" : "card hover:bg-surface"}`}
      >
        {/* The GameCube controller (round 920, Matthew): on the gold bar it sits in a dark slanted tile, gold on dark. */}
        <span aria-hidden="true" className={up ? "flex size-9 shrink-0 -skew-x-[10deg] items-center justify-center bg-[#1a1200] text-[#ffd447]" : "shrink-0 text-muted"}>
          <Icon name="gamepad" className={`text-2xl ${up ? "skew-x-[10deg]" : ""}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-bold ${up ? "text-lg leading-tight font-black tracking-wide uppercase italic" : ""}`}>
            {hosted.state === "live" ? t("entering.mysets.playingNow") : up ? t("play.teaser.strike") : t("play.teaser.next", { name: hosted.opponent ?? t("entering.mysets.tbd") })}
          </span>
          <span className={`block truncate text-meta ${up ? "font-semibold opacity-80" : "text-muted"}`}>
            {up ? `${t("play.teaser.vs", { name: hosted.opponent ?? t("entering.mysets.tbd") })}${hosted.identifier ? ` · ${t("entering.mysets.setId", { id: hosted.identifier })}` : ""}` : hosted.eventName}
          </span>
        </span>
        <span aria-hidden="true" className="teaser-arrow">→</span>
      </Link>
      </DismissableTeaser>
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
    <DismissableTeaser id={`s:${set.id}:${ev.status.kind}${set.called ? ":called" : ""}`} label={t("ui.dismiss")} glow={up}>
    <Link
      href="/my-sets"
      className={`flex items-center gap-3 py-2.5 pr-12 pl-4 ${up ? "banner-up teaser-up" : "card hover:bg-surface"}`}
    >
      {/* The GameCube controller (round 920, Matthew): on the gold bar it sits in a dark slanted tile, gold on dark. */}
      <span aria-hidden="true" className={up ? "flex size-9 shrink-0 -skew-x-[10deg] items-center justify-center bg-[#1a1200] text-[#ffd447]" : "shrink-0 text-muted"}>
        <Icon name="gamepad" className={`text-2xl ${up ? "skew-x-[10deg]" : ""}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-bold ${up ? "text-lg leading-tight font-black tracking-wide uppercase italic" : ""}`}>{up ? (set.called ? t("entering.mysets.calledNow") : t("entering.mysets.playingNow")) : t("play.teaser.next", { name: vs })}</span>
        <span className={`block truncate text-meta ${up ? "font-semibold opacity-80" : "text-muted"}`}>
          {up ? `${t("play.teaser.vs", { name: vs })}${set.station ? ` · ${t("entering.mysets.station", { station: set.station })}` : ""}` : `${set.roundLabel} · ${ev.tournamentName}`}
        </span>
      </span>
      <span aria-hidden="true" className="teaser-arrow">→</span>
    </Link>
    </DismissableTeaser>
  );
}
