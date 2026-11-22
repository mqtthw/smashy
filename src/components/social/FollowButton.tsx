"use client";

import { useOptimistic, useState, useTransition } from "react";
import { follow, unfollow } from "@/app/follow-actions";
import type { FollowState } from "@/lib/follows";
import { runAction } from "@/components/ui/Toaster";
import { useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

export default function FollowButton({
  profileId,
  state,
  isProtected,
  signedIn,
}: {
  profileId: string;
  state: FollowState;
  isProtected: boolean;
  signedIn: boolean;
}) {
  const t = useT();
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [hover, setHover] = useState(false);
  const [, startTransition] = useTransition();

  if (!signedIn) {
    return <SignInLink className="btn btn-md btn-inverse">{t("feed.follow.follow")}</SignInLink>;
  }

  const act = (next: FollowState, run: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setOptimistic(next);
      await runAction(run);
    });

  if (optimistic === "none") {
    return (
      <button
        type="button"
        onClick={() => act(isProtected ? "pending" : "active", () => follow(profileId))}
        className="btn btn-md btn-inverse"
      >
        {t("feed.follow.follow")}
      </button>
    );
  }
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => act("none", () => unfollow(profileId))}
      className={`btn btn-md ${hover ? "btn-danger" : "btn-outline"}`}
    >
      {optimistic === "pending" ? (hover ? t("feed.follow.cancelRequest") : t("feed.follow.requested")) : hover ? t("feed.follow.unfollow") : t("feed.following")}
    </button>
  );
}
