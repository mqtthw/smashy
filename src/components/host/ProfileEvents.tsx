import Link from "next/link";
import { placeKey } from "@/lib/i18n/core";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import { getHostedRecord, getProfileEvents } from "@/lib/hostedEvents";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";


/** A profile's Events tab: their results at events on Smashy, and the events they host. */
export default async function ProfileEvents({ userId, isMe }: { userId: string; isMe: boolean }) {
  const [{ hosted, results }, record] = await Promise.all([getProfileEvents(userId), getHostedRecord(userId)]);
  if (!hosted.length && !results.length && record.events === 0) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-muted"><T k="hostsetup.profile.none" /></p>
        {isMe && <Link href="/host/new" className="btn btn-md btn-primary"><T k="hostsetup.profile.host" /></Link>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5 p-4">
      {record.events > 0 && (
        <section aria-labelledby="record" className="flex flex-col gap-2">
          <h2 id="record" className="font-bold"><T k="hostsetup.profile.record" /></h2>
          <dl className="card grid grid-cols-3 divide-x divide-line text-center">
            {([
              ["hostsetup.profile.events", String(record.events)],
              ["hostsetup.profile.sets", `${record.setWins}–${record.setLosses}`],
              ["hostsetup.profile.games", `${record.gameWins}–${record.gameLosses}`],
            ] as [MessageKey, string][]).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 px-2 py-3">
                <dt className="text-meta text-muted"><T k={label} /></dt>
                <dd className="font-mono text-lg font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {results.length > 0 && (
        <section aria-labelledby="results" className="flex flex-col gap-2">
          <h2 id="results" className="font-bold"><T k="hostsetup.profile.results" /></h2>
          <ul className="card divide-y divide-line">
            {results.map((r) => (
              <li key={r.event.id}>
                <Link href={`/host/${r.event.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-surface">
                  <span className="w-12 font-mono text-sm font-bold tabular-nums"><T k={placeKey(r.place)} values={{ n: r.place }} /></span>
                  <span className="min-w-0 flex-1 truncate">{r.event.name}</span>
                  <span className="text-meta text-muted"><LocalTime iso={r.event.startsAt} style="shortDate" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {hosted.length > 0 && (
        <section aria-labelledby="hosted" className="flex flex-col gap-2">
          <h2 id="hosted" className="font-bold"><T k="hostsetup.profile.hosted" /></h2>
          <ul className="card divide-y divide-line">
            {hosted.map((e) => (
              <li key={e.id}>
                <Link href={`/host/${e.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-surface">
                  <GameBadge game={e.game} />
                  <span className="min-w-0 flex-1 truncate">{e.name}</span>
                  <span className="text-meta text-muted">
                    {e.status === "completed" ? <T k="event.status.completed" /> : e.status === "in_progress" ? <T k="hostsetup.profile.live" /> : <LocalTime iso={e.startsAt} style="shortDate" />}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
