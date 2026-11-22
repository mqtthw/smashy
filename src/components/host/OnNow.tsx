import Link from "next/link";
import Icon from "@/components/ui/Icon";
import LiveDot from "@/components/ui/LiveDot";
import type { EngineSet } from "@/lib/bracketEngine";
import { getT } from "@/lib/i18n/server";
import { isStreamSetup } from "@/lib/streamSet";

/** Spectators: the sets being played or waiting to start right now (tap one to follow it live). Sets on stream come first, marked with a camera. */
export default async function OnNow({ sets, tagOf, scores = {}, stations = {}, className = "" }: { sets: EngineSet[]; tagOf: (id: string | null) => string; scores?: Record<string, [number, number]>; stations?: Record<string, string>; className?: string }) {
  const now = sets.filter((s) => (s.state === "live" || s.state === "ready") && s.p[0].id && s.p[1].id);
  if (!now.length) return null;
  const t = await getT();
  const streamed = (s: EngineSet) => isStreamSetup(stations[s.key]);
  const ordered = [...now.filter(streamed), ...now.filter((s) => !streamed(s) && s.state === "live"), ...now.filter((s) => !streamed(s) && s.state === "ready")];
  const playing = now.filter((s) => s.state === "live").length;
  return (
    <section className={`board flex flex-col gap-1 p-4 ${className}`} aria-labelledby="on-now">
      <div className="flex items-center justify-between gap-2">
        <h2 id="on-now" className="font-bold">{t("event.onNow")}</h2>
        {playing > 0 && <LiveDot>{t("event.liveCount", { n: playing })}</LiveDot>}
      </div>
      <ul className="divide-y divide-line">
        {ordered.slice(0, 12).map((s) => (
          <li key={s.key}>
            <Link href={`/host/set/${s.key}`} className="flex items-center gap-2 py-2.5 text-sm hover:underline">
              <span className="w-8 shrink-0 font-mono text-muted">{s.identifier}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {streamed(s) && <Icon name="video" label={t("event.onStream")} className="mr-1.5 text-muted" />}
                {tagOf(s.p[0].id)} <span className="font-normal text-muted">vs</span> {tagOf(s.p[1].id)}
              </span>
              {s.state === "live" ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
                  {scores[s.key] ? <span className="font-mono text-base font-bold tabular-nums">{scores[s.key][0]}–{scores[s.key][1]}</span> : <span className="text-meta font-semibold">{t("event.playing")}</span>}
                </span>
              ) : (
                <span className="shrink-0 text-meta text-muted">
                  {stations[s.key] ? (
                    <>
                      <Icon name="pin" /> {stations[s.key]}
                    </>
                  ) : (
                    t("event.upNext")
                  )}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {ordered.length > 12 && <p className="text-meta text-muted">{t("event.moreInBracket", { n: ordered.length - 12 })}</p>}
    </section>
  );
}
