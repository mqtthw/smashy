"use client";

import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import { setRsvp } from "@/app/events/actions";
import type { RsvpStatus } from "@/lib/rsvps";
import Avatar from "@/components/ui/Avatar";
import { runAction } from "@/components/ui/Toaster";
import { askForReviewAfterWin } from "@/lib/appReview";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

type Props = {
  kind: "tournament" | "weekly";
  eventRef: string;
  total: number;
  interested: number;
  mine: RsvpStatus | null;
  friends: { tag: string; handle: string; avatarUrl: string | null }[];
  signedIn: boolean;
  calendarHref: string;
};

/** "I'm going" and "Interested" + how many are each (and which mutuals are going), plus Add to calendar. */
export default function GoingButton({ kind, eventRef, total, interested, mine, friends, signedIn, calendarHref }: Props) {
  const t = useT();
  const [state, setOptimistic] = useOptimistic({ total, interested, mine });
  // Pressing the answer you already gave takes it back; pressing the other one switches.
  const choose = (pick: RsvpStatus) =>
    startTransition(async () => {
      const next = state.mine === pick ? null : pick;
      setOptimistic({
        mine: next,
        total: state.total - (state.mine === "going" ? 1 : 0) + (next === "going" ? 1 : 0),
        interested: state.interested - (state.mine === "interested" ? 1 : 0) + (next === "interested" ? 1 : 0),
      });
      // Saying "I'm going": a good moment to ask for a store rating (round 643).
      if ((await runAction(() => setRsvp(kind, eventRef, next))) && next === "going") askForReviewAfterWin();
    });
  const going = state.mine === "going";
  const others = state.total - (going ? 1 : 0);

  return (
    <section className="card flex flex-col gap-3 p-4" aria-label={t("browse.going.label")}>
      <div className="flex flex-wrap items-center gap-2">
        {signedIn ? (
          <>
            <button type="button" onClick={() => choose("going")} aria-pressed={going} className={`btn btn-md ${going ? "btn-outline" : "btn-primary"}`}>
              {going ? t("browse.going.youreGoing") : t("browse.going.imGoing")}
            </button>
            <button type="button" onClick={() => choose("interested")} aria-pressed={state.mine === "interested"} className="btn btn-md btn-outline">
              {state.mine === "interested" ? t("browse.going.youreInterested") : t("browse.going.interested")}
            </button>
          </>
        ) : (
          <>
            <SignInLink className="btn btn-md btn-primary">{t("browse.going.imGoing")}</SignInLink>
            <SignInLink className="btn btn-md btn-outline">{t("browse.going.interested")}</SignInLink>
          </>
        )}
        <a href={calendarHref} className="btn btn-md btn-ghost" download>
          <Icon name="calendar" /> {t("event.addToCalendar")}
        </a>
      </div>
      <p className="text-sm text-muted">
        {state.total === 0
          ? t("browse.going.nobody")
          : going
            ? others === 0
              ? t("browse.going.youFirst")
              : t("browse.going.youAndOthers", { n: others })
            : t("browse.going.count", { n: state.total })}
        {state.interested > 0 && ` ${t("browse.going.interestedCount", { n: state.interested })}`}
        {state.mine && t("browse.going.remind")}
      </p>
      {friends.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2 text-sm" aria-label={t("browse.going.friends")}>
          {friends.map((f) => (
            <li key={f.handle}>
              <Link href={`/u/${f.handle}`} className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2 hover:bg-surface">
                <Avatar name={f.tag} src={f.avatarUrl} size="sm" className="h-6 w-6" />
                {f.tag}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
