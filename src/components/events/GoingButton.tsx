"use client";

import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import { setGoing } from "@/app/events/actions";
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
  mine: boolean;
  friends: { tag: string; handle: string; avatarUrl: string | null }[];
  signedIn: boolean;
  calendarHref: string;
};

/** "I'm going" + how many are going (and which mutuals), plus Add to calendar. */
export default function GoingButton({ kind, eventRef, total, mine, friends, signedIn, calendarHref }: Props) {
  const t = useT();
  const [state, setOptimistic] = useOptimistic({ total, mine });
  const toggle = () =>
    startTransition(async () => {
      const next = !state.mine;
      setOptimistic({ mine: next, total: state.total + (next ? 1 : -1) });
      // Saying "I'm going": a good moment to ask for a store rating (round 643).
      if ((await runAction(() => setGoing(kind, eventRef, next))) && next) askForReviewAfterWin();
    });
  const others = state.total - (state.mine ? 1 : 0);

  return (
    <section className="card flex flex-col gap-3 p-4" aria-label={t("browse.going.label")}>
      <div className="flex flex-wrap items-center gap-2">
        {signedIn ? (
          <button type="button" onClick={toggle} aria-pressed={state.mine} className={`btn btn-md ${state.mine ? "btn-outline" : "btn-primary"}`}>
            {state.mine ? t("browse.going.youreGoing") : t("browse.going.imGoing")}
          </button>
        ) : (
          <SignInLink className="btn btn-md btn-primary">{t("browse.going.imGoing")}</SignInLink>
        )}
        <a href={calendarHref} className="btn btn-md btn-ghost" download>
          <Icon name="calendar" /> {t("event.addToCalendar")}
        </a>
      </div>
      <p className="text-sm text-muted">
        {state.total === 0
          ? t("browse.going.nobody")
          : state.mine
            ? others === 0
              ? t("browse.going.youFirst")
              : t("browse.going.youAndOthers", { n: others })
            : t("browse.going.count", { n: state.total })}
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
