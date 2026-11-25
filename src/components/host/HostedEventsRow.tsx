import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import type { HostedEvent } from "@/lib/hostedEvents";
import Icon, { type IconName } from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";

// /host/new sends signed-out visitors to sign in and back, so the button is for everyone.
const PITCH: { icon: IconName; text: MessageKey }[] = [
  { icon: "clipboard", text: "hostsetup.row.pitch1" },
  { icon: "phone", text: "hostsetup.row.pitch2" },
  { icon: "trophy", text: "hostsetup.row.pitch3" },
];

/** Events hosted on Smashy (online and in person), as a scrolling row of cards on the Events tab. */
export default function HostedEventsRow({ events, friends = {} }: { events: HostedEvent[]; friends?: Record<string, string | null> }) {
  return (
    <section aria-labelledby="hosted-events" className="border-b border-line py-3">
      <div className="flex items-center justify-between gap-2 px-4">
        <h2 id="hosted-events" className="text-title font-bold"><T k="hostsetup.row.title" /></h2>
        {events.length > 0 && <Link href="/host/new" className="btn btn-sm btn-outline"><T k="hostsetup.row.host" /></Link>}
      </div>
      {events.length === 0 ? (
        <div className="px-4 pt-3">
          <div className="card flex flex-col gap-3 p-4">
            <p className="text-sm text-muted"><T k="hostsetup.row.empty" /></p>
            <p className="font-bold"><T k="hostsetup.row.pitchTitle" /></p>
            <ul className="flex flex-col gap-2 text-sm">
              {PITCH.map((p) => (
                <li key={p.text} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-brand"><Icon name={p.icon} /></span>
                  <T k={p.text} />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link href="/host/new" className="btn btn-md btn-primary"><T k="hostsetup.row.host" /></Link>
              <Link href="/host/demo" className="btn btn-md btn-outline"><T k="hostsetup.row.demo" /></Link>
              <Link href="/host/about" className="px-2 text-sm text-brand hover:underline"><T k="hostsetup.row.how" /></Link>
            </div>
          </div>
        </div>
      ) : (
        <ul className="scroll-fade flex gap-3 overflow-x-auto px-4 pt-3 pb-1">
          {events.map((e) => (
            <li key={e.id} className="w-60 shrink-0">
              <Link href={`/host/${e.id}`} className="card flex h-full flex-col gap-1.5 p-3 hover:bg-surface">
                <span className="text-meta font-semibold uppercase tracking-wide text-brand">{e.status === "in_progress" ? <>● <T k="event.status.liveNow" /></> : <LocalTime iso={e.startsAt} style="dayDateTime" />}</span>
                <span className="line-clamp-2 font-bold">{e.name}</span>
                <span className="truncate text-meta text-muted"><Icon name={e.online ? "globe" : "pin"} /> {e.online ? <><T k="event.online" />{e.region ? ` · ${e.region}` : ""}</> : (e.location ?? <T k="event.inPerson" />)}</span>
                {friends[e.id] && <span className="truncate text-meta text-muted"><Icon name="user" /> {friends[e.id]}</span>}
                <span className="mt-auto flex items-center gap-2 text-meta text-muted">
                  <GameBadge game={e.game} />
                  <T k="hostsetup.card.players" values={{ players: e.entrantCount, cap: e.entrantCap }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
