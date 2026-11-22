"use client";

import { localeFor } from "@/lib/i18n/base";
import { useState } from "react";
import { toggleReelLike } from "@/app/reels/actions";
import { runAction } from "@/components/ui/Toaster";
import { useLang, useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

/** The clip page's like button (same likes as in Reels). Keeps its own state, so it doesn't snap back. */
export default function ClipLikeButton({ clipId, liked, count, signedIn }: { clipId: string; liked: boolean; count: number; signedIn: boolean }) {
  const [state, setState] = useState({ liked, count });
  const [busy, setBusy] = useState(false);
  const t = useT();
  const lang = useLang();
  const heart = (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 ${state.liked ? "fill-like stroke-like" : "fill-none stroke-current"}`} strokeWidth={2}>
      <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4C11.8 6.1 13.2 5 15.2 5c3.5 0 5.6 3.4 4.3 6.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
  const label = state.count > 0 ? new Intl.NumberFormat(localeFor(lang), { notation: "compact" }).format(state.count) : t("media.reels.like");
  if (!signedIn) {
    return <SignInLink aria-label={t("media.reels.signInToLike")} className="btn btn-sm btn-outline gap-1.5">{heart}{label}</SignInLink>;
  }
  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={t(state.liked ? "media.reels.unlike" : "media.reels.like")}
      disabled={busy}
      onClick={async () => {
        const before = state;
        const next = !state.liked;
        setState({ liked: next, count: state.count + (next ? 1 : -1) });
        setBusy(true);
        const ok = await runAction(() => toggleReelLike(clipId, next));
        setBusy(false);
        if (!ok) setState(before); // put it back if it didn't save
      }}
      className="btn btn-sm btn-outline gap-1.5"
    >
      {heart}
      {label}
    </button>
  );
}
