"use client";

import { startTransition, useOptimistic } from "react";
import { toggleVote } from "@/app/highlights/actions";
import { runAction } from "@/components/ui/Toaster";
import { useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

/** ▲ upvote for highlights. Totals are counted by the database; you can't upvote your own. */
export default function VoteButton({
  highlightId,
  voted,
  count,
  signedIn,
  isMine,
}: {
  highlightId: string;
  voted: boolean;
  count: number;
  signedIn: boolean;
  isMine: boolean;
}) {
  const t = useT();
  const [state, setOptimistic] = useOptimistic({ voted, count });
  const body = (
    <>
      <span aria-hidden="true">▲</span>
      <span className="text-sm font-semibold">{state.count}</span>
    </>
  );
  const base = "flex items-center gap-1 rounded-full border px-2.5 py-0.5";

  if (!signedIn) {
    return <SignInLink aria-label={t("media.hl.signInToUpvote")} className={`${base} border-line text-muted hover:text-brand`}>{body}</SignInLink>;
  }
  if (isMine) {
    return <span className={`${base} border-line text-muted`} title={t("media.hl.upvotesOnYours")}>{body}</span>;
  }
  return (
    <button
      type="button"
      aria-pressed={state.voted}
      aria-label={t(state.voted ? "media.hl.removeUpvote" : "media.hl.upvote")}
      onClick={() =>
        startTransition(async () => {
          const next = !state.voted;
          setOptimistic({ voted: next, count: state.count + (next ? 1 : -1) });
          await runAction(() => toggleVote(highlightId, next));
        })
      }
      className={`${base} ${state.voted ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:text-brand"}`}
    >
      {body}
    </button>
  );
}
