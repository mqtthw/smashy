"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useSharedPostState } from "@/lib/sharedPostState";
import { useDismiss } from "@/lib/useDismiss";
import { toggleRepost } from "@/app/feed-actions";
import { runAction } from "@/components/ui/Toaster";
import type { FeedGame } from "@/lib/postConstants";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/client";

// The post box (for "Quote") loads when someone first quotes (round 569): every post on every page
// has this button, so it was part of the first download even for visitors who can't post.
const PostComposer = dynamic(() => import("./PostComposer"));
import SignInLink from "@/components/ui/SignInLink";

/**
 * The "Quote post" window. A real dialog: the keyboard stays inside it, Escape closes it, and
 * screen readers announce it (it used to be a plain box drawn over the page, so Tab walked through
 * the feed behind it and Escape did nothing). Clicking outside it closes it too.
 */
function QuoteDialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    // No close() on cleanup: that would fire onClose the moment React re-runs this effect (it does in development).
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      aria-label={t("feed.repost.quoteTitle")}
      className="m-auto mt-20 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-background p-0 text-foreground backdrop:bg-overlay"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="font-bold">{t("feed.repost.quoteTitle")}</span>
        <button type="button" onClick={() => dialog.current?.close()} aria-label={t("common.close")} className="-m-2 p-2 text-muted">✕</button>
      </div>
      {children}
    </dialog>
  );
}

/** 🔁 button: Repost / Undo repost, or Quote (write a post that embeds this one). */
export default function RepostButton({
  postId,
  reposted,
  count,
  signedIn,
  game,
}: {
  postId: string;
  reposted: boolean;
  count: number;
  signedIn: boolean;
  game: FeedGame;
}) {
  const t = useT();
  // Keeps its own state like the heart (reposting doesn't reload the feed); new numbers from the page
  // replace it. Shared by every copy of the post on screen (round 638).
  const [state, setState] = useSharedPostState(`repost:${postId}`, { reposted, count });
  const [menu, setMenu] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const box = useDismiss(menu, () => setMenu(false));

  const icon = (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
        <path d="M4 9V7a2 2 0 0 1 2-2h11l-3-3m3 3-3 3M20 15v2a2 2 0 0 1-2 2H7l3 3m-3-3 3-3" />
      </svg>
      <span className="text-sm">{state.count > 0 ? state.count : ""}</span>
    </>
  );

  if (!signedIn) {
    return (
      <SignInLink aria-label={t("feed.repost.signIn")} className="flex items-center gap-1 text-muted hover:text-repost">
        {icon}
      </SignInLink>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={state.reposted ? t("feed.repost.optionsReposted") : t("feed.repost.options")}
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
        className={`-m-2.5 flex items-center gap-1 p-2.5 ${state.reposted ? "text-repost" : "text-muted hover:text-repost"}`}
      >
        {icon}
      </button>
      {menu && (
        <div className="absolute left-0 z-10 mt-1 w-40 rounded-xl border border-line bg-background p-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              const before = state;
              const next = !state.reposted;
              setState({ reposted: next, count: Math.max(0, state.count + (next ? 1 : -1)) });
              startTransition(async () => {
                if (!(await runAction(() => toggleRepost(postId, next)))) setState(before);
              });
            }}
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface"
          >
            {state.reposted ? t("feed.repost.undo") : t("feed.repost.repost")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              setQuoting(true);
            }}
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface"
          >
            {t("feed.repost.quote")}
          </button>
        </div>
      )}
      {quoting && (
        <QuoteDialog onClose={() => setQuoting(false)}>
          <PostComposer quoteOf={postId} defaultGame={game} placeholder={t("feed.repost.take")} onPosted={() => setQuoting(false)} />
        </QuoteDialog>
      )}
    </div>
  );
}
