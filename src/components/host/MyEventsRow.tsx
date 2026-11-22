import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import StartsIn from "@/components/host/StartsIn";
import type { MyHostedEvent } from "@/lib/hostedEvents";
import type { MyEvent } from "@/lib/brackets/startgg";
import { BRACKET_HOURS } from "@/lib/format";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";
import type { MessageKey, Values } from "@/lib/i18n/core";

const suffix = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, "st" | "nd" | "rd">)[n % 10] ?? "th"));
/** "You placed 3rd", in the visitor's language. */
const placed = (n: number): { k: MessageKey; v: Values } => ({ k: `hostsetup.mine.placed.${suffix(n)}`, v: { n } });

type Tag = { k: MessageKey; v?: Values; cls: string };

/** The events you host or signed up for (upcoming or live), at the top of Events, with what needs doing. */
export default function MyEventsRow({ events, startgg = [], now = 0 }: { events: MyHostedEvent[]; startgg?: MyEvent[]; now?: number }) {
  if (!events.length && !startgg.length) return null;
  return (
    <section aria-labelledby="my-events" className="border-b border-line py-3">
      <h2 id="my-events" className="px-4 text-title font-bold"><T k="hostsetup.mine.title" /></h2>
      <ul className="flex gap-3 overflow-x-auto px-4 pt-3 pb-1">
        {events.map((e) => {
          const tag: Tag =
            e.status === "completed"
              ? { ...(e.placement ? placed(e.placement) : { k: "hostsetup.mine.resultsIn" }), cls: "border border-line text-foreground" }
              : e.status === "in_progress"
              ? { k: "event.status.liveNow", cls: "bg-brand text-white" }
              : e.checkInOpen && !e.checkedIn
                ? { k: "hostsetup.mine.checkInNow", cls: "bg-brand text-white" }
                : e.role === "host"
                  ? { k: "hostsetup.mine.hosting", cls: "border border-line text-muted" }
                  : e.role === "cohost"
                  ? { k: "hostsetup.mine.cohost", cls: "border border-line text-muted" }
                  : { k: e.checkedIn ? "hostsetup.mine.checkedIn" : "hostsetup.mine.signedUp", cls: "border border-line text-muted" };
          return (
            <li key={e.id} className="w-60 shrink-0">
              <Link href={`/host/${e.id}`} className="card flex h-full flex-col gap-1.5 p-3 hover:bg-surface">
                <span className={`badge w-fit font-semibold ${tag.cls}`}><T k={tag.k} values={tag.v} /></span>
                <span className="line-clamp-2 font-bold">{e.name}</span>
                <span className="text-meta text-muted">
                  <LocalTime iso={e.startsAt} style="dayDateTime" />
                  {e.status !== "in_progress" && e.status !== "completed" && (
                    <StartsIn iso={e.startsAt} within={24 * 3600_000} prefix="in" className="ml-1 font-semibold text-brand" />
                  )}
                </span>
                <span className="mt-auto flex items-center gap-2 text-meta text-muted">
                  <GameBadge game={e.game} />
                  <Icon name={e.online ? "globe" : "pin"} /> {e.online ? <T k="event.online" /> : (e.location ?? <T k="event.inPerson" />)}
                </span>
              </Link>
            </li>
          );
        })}
        {startgg.map((e) => {
          // start.gg sign-ups (linked account): live ones open your path through the bracket.
          const tag: Tag =
            e.state === "done"
              ? { ...(e.placement ? placed(e.placement) : { k: "hostsetup.mine.resultsIn" }), cls: "border border-line text-foreground" }
              : e.status.kind === "up"
                ? { k: "hostsetup.mine.youreUp", cls: "bg-brand text-white" }
                : e.state === "live" && e.status.kind === "waiting" && now - e.startAt > BRACKET_HOURS
                  ? { k: "hostsetup.mine.pending", cls: "border border-line text-foreground" }
                  : e.state === "live"
                  ? { k: "event.status.liveNow", cls: "bg-brand text-white" }
                  : { k: "hostsetup.mine.startgg", cls: "border border-line text-muted" };
          const href = e.state === "upcoming" ? `/events/${e.tournamentSlug}` : `/brackets/startgg/${e.eventId}`;
          return (
            <li key={`sgg-${e.eventId}`} className="w-60 shrink-0">
              <Link href={href} className="card flex h-full flex-col gap-1.5 p-3 hover:bg-surface">
                <span className={`badge w-fit font-semibold ${tag.cls}`}><T k={tag.k} values={tag.v} /></span>
                <span className="line-clamp-2 font-bold">{e.tournamentName}</span>
                <span className="text-meta text-muted">
                  <LocalTime iso={new Date(e.startAt * 1000).toISOString()} style="dayDateTime" />
                  {e.state === "upcoming" && <StartsIn iso={new Date(e.startAt * 1000).toISOString()} within={24 * 3600_000} prefix="in" className="ml-1 font-semibold text-brand" />}
                </span>
                <span className="mt-auto flex items-center gap-2 text-meta text-muted">
                  {e.game && <GameBadge game={e.game} />}
                  <span className="truncate">{e.eventName}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
