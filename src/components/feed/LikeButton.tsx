"use client";

import { startTransition } from "react";
import { useSharedPostState } from "@/lib/sharedPostState";
import { toggleLike } from "@/app/feed-actions";
import { runAction } from "@/components/ui/Toaster";
import { useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

export default function LikeButton({
  postId,
  liked,
  count,
  signedIn,
}: {
  postId: string;
  liked: boolean;
  count: number;
  signedIn: boolean;
}) {
  const t = useT();
  // The heart updates instantly and keeps its own state (liking doesn't reload the feed, so a ranked
  // For You doesn't reshuffle under your thumb); it takes new numbers when the page sends them. Every
  // copy of the post on screen (the Feed's game tabs) shows the same heart (round 638).
  const [state, setState] = useSharedPostState(`like:${postId}`, { liked, count });

  const content = (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 ${state.liked ? "fill-like" : "fill-none stroke-current"}`} strokeWidth={2}>
        <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4C11.8 6.1 13.2 5 15.2 5c3.5 0 5.6 3.4 4.3 6.7C19.5 16.4 12 21 12 21z" />
      </svg>
      <span className="text-sm">{state.count > 0 ? state.count : ""}</span>
    </>
  );

  if (!signedIn) {
    return (
      <SignInLink aria-label={t("feed.like.signIn")} className="flex items-center gap-1 text-muted hover:text-like">
        {content}
      </SignInLink>
    );
  }

  return (
    <button
      type="button"
      aria-label={state.liked ? t("feed.like.unlike") : t("feed.like.like")}
      aria-pressed={state.liked}
      onClick={() => {
        const before = state;
        const next = !state.liked;
        setState({ liked: next, count: Math.max(0, state.count + (next ? 1 : -1)) });
        startTransition(async () => {
          // On failure the heart goes back and a notice says why.
          if (!(await runAction(() => toggleLike(postId, next)))) setState(before);
        });
      }}
      className={`-m-2.5 flex items-center gap-1 p-2.5 ${state.liked ? "text-like" : "text-muted hover:text-like"}`}
    >
      {content}
    </button>
  );
}
