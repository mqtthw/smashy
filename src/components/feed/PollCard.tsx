"use client";

import { startTransition, useState } from "react";
import { votePoll } from "@/app/feed-actions";
import { runAction } from "@/components/ui/Toaster";
import type { Poll } from "@/lib/posts";
import { useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

function timeLeft(closesAt: string, now: number, t: ReturnType<typeof useT>): string {
  const s = Date.parse(closesAt) / 1000 - now;
  if (s <= 0) return t("feed.poll.final");
  if (s < 3600) return t("feed.poll.minLeft", { n: Math.max(1, Math.round(s / 60)) });
  if (s < 85500) return t("feed.poll.hoursLeft", { n: Math.max(1, Math.round(s / 3600)) });
  return t("feed.poll.daysLeft", { n: Math.max(1, Math.round(s / 86400)) });
}

/** A poll: tap a choice to vote (once). Results show after you vote, or when it closes. */
export default function PollCard({ postId, poll, now, signedIn, isMine }: { postId: string; poll: Poll; now: number; signedIn: boolean; isMine: boolean }) {
  const t = useT();
  // Keeps its own state like the heart (voting doesn't reload the feed); a newer poll from the page replaces it.
  const [state, setState] = useState(poll);
  const [seen, setSeen] = useState(poll);
  if (seen !== poll) {
    setSeen(poll);
    setState(poll);
  }
  const closed = Date.parse(state.closesAt) / 1000 <= now;
  const showResults = closed || state.myChoice !== null || isMine;
  const lead = Math.max(...state.counts);

  const vote = (choice: number) => {
    const before = state;
    const counts = state.counts.map((c, i) => (i === choice ? c + 1 : c));
    setState({ ...state, counts, total: state.total + 1, myChoice: choice });
    startTransition(async () => {
      // A refused vote (the poll closed meanwhile) puts the choices back, with a notice.
      if (!(await runAction(() => votePoll(postId, choice)))) setState(before);
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-1.5" role="group" aria-label={t("feed.poll.legend")}>
      {state.options.map((opt, i) => {
        const pct = state.total ? Math.round((state.counts[i] / state.total) * 100) : 0;
        if (showResults) {
          return (
            <div key={i} className="relative overflow-hidden rounded-lg border border-line px-3 py-1.5 text-sm">
              <div
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 ${closed && state.counts[i] === lead && lead > 0 ? "bg-brand/25" : "bg-surface-2"}`}
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex justify-between gap-2">
                <span className={state.myChoice === i ? "font-semibold" : ""}>
                  {opt}
                  {state.myChoice === i && <span aria-label={t("feed.poll.yourVote")}> ✓</span>}
                </span>
                <span className="font-semibold tabular-nums">{pct}%</span>
              </span>
            </div>
          );
        }
        return signedIn ? (
          <button key={i} type="button" onClick={() => vote(i)} className="rounded-lg border border-brand px-3 py-1.5 text-left text-sm font-semibold text-brand hover:bg-brand/10">
            {opt}
          </button>
        ) : (
          <SignInLink key={i} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface">
            {opt}
          </SignInLink>
        );
      })}
      <p className="text-meta text-muted">
        {t("feed.poll.votes", { n: state.total })} · {timeLeft(state.closesAt, now, t)}
        {!signedIn && !closed && ` · ${t("feed.poll.signIn")}`}
      </p>
    </div>
  );
}
