import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import { formatSummary, type EventBracket } from "@/lib/hostedEvents";
import type { MessageKey } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import BracketJoin from "./BracketJoin";

const STATUS_KEY: Record<string, MessageKey> = {
  open: "event.status.open",
  closed: "event.status.closed",
  in_progress: "event.status.liveNow",
  completed: "event.status.completed",
  canceled: "event.status.canceled",
};

/**
 * Every bracket of one event (the main one, then extras like Redemption or a second game), on each
 * of their pages: where each stands, a way to it, and a sign-up button for the ones you aren't in.
 */
export default async function EventBrackets({
  brackets,
  currentId,
  mine,
  signedIn,
  addHref,
  now,
}: {
  brackets: EventBracket[];
  currentId: string;
  mine: Set<string>; // the brackets the viewer is signed up for
  signedIn: boolean;
  addHref?: string; // the main host: where a new bracket is added
  now: number;
}) {
  const t = await getT();
  const main = brackets.find((b) => b.main);
  const severalGames = new Set(brackets.map((b) => b.game)).size > 1;
  return (
    <section className="card flex flex-col gap-1 p-4" aria-labelledby="event-brackets">
      <h2 id="event-brackets" className="font-bold">{t("event.brackets.title")}</h2>
      <ul className="divide-y divide-line">
        {brackets.map((b) => {
          const here = b.id === currentId;
          // The main bracket stops taking sign-ups at its start time; extra ones when the host closes or starts them.
          const joinable = b.status === "open" && (!b.main || now < Date.parse(b.startsAt));
          const otherTime = main && !b.main && Math.abs(Date.parse(b.startsAt) - Date.parse(main.startsAt)) > 5 * 60_000;
          return (
            <li key={b.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2">
                  <Link href={`/host/${b.id}`} aria-current={here ? "page" : undefined} className={`font-semibold hover:underline ${here ? "text-brand" : ""}`}>
                    {b.label}
                  </Link>
                  {severalGames && <GameBadge game={b.game} />}
                  {here && <span className="text-meta text-muted">{t("event.brackets.thisPage")}</span>}
                </p>
                <p className="text-meta text-muted">
                  {b.teamSize === 2 ? t("event.brackets.doubles") : ""}
                  {formatSummary(b, t)} · {b.players} / {b.cap} {b.teamSize === 2 ? t("event.brackets.teams") : t("event.brackets.players")} · {STATUS_KEY[b.status] ? t(STATUS_KEY[b.status]) : b.status}
                  {otherTime && (
                    <>
                      {t("event.brackets.starts")}
                      <LocalTime iso={b.startsAt} style="dayDateTime" />
                    </>
                  )}
                </p>
              </div>
              {mine.has(b.id) ? (
                <span className="shrink-0 text-sm font-semibold">{t("event.brackets.youreIn")}</span>
              ) : signedIn && joinable && !here && b.teamSize === 2 ? (
                // Doubles needs a partner's name, so signing up happens on that bracket's page.
                <Link href={`/host/${b.id}`} className="btn btn-sm btn-primary shrink-0" aria-label={t("event.brackets.signUpFor", { label: b.label })}>
                  {t("event.brackets.signUp")}
                </Link>
              ) : signedIn && joinable && !here ? (
                <BracketJoin eventId={b.id} label={b.label} full={b.players >= b.cap} />
              ) : null}
            </li>
          );
        })}
      </ul>
      {addHref && (
        <Link href={addHref} className="btn btn-sm btn-outline self-start">
          {t("hostrun.brackets.add")}
        </Link>
      )}
    </section>
  );
}
