"use client";
// "Follow" on any start.gg player's page (round 797): a private follow, so their upcoming tournaments show
// on the Events page. Signed-out visitors get a link to sign in instead.
import Link from "next/link";
import { useState, useTransition } from "react";
import { followPlayer, unfollowPlayer } from "@/app/players/actions";
import { useT } from "@/lib/i18n/client";

export default function FollowPlayerButton({ playerId, tag, following, signedIn }: { playerId: string; tag: string; following: boolean; signedIn: boolean }) {
  const t = useT();
  const [on, setOn] = useState(following);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <Link href={`/signin?next=${encodeURIComponent(`/players/${playerId}`)}`} className="btn btn-md btn-outline">
        {t("people.follow.button")}
      </Link>
    );
  }

  const toggle = () =>
    start(async () => {
      setError(null);
      const was = on;
      setOn(!was); // shown at once, put back if it didn't save
      try {
        const res = was ? await unfollowPlayer(playerId) : await followPlayer(playerId, tag);
        if (res.error) {
          setOn(was);
          setError(res.error);
        }
      } catch {
        setOn(was);
        setError(t("people.follow.err"));
      }
    });

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={on} className={`btn btn-md ${on ? "btn-outline" : "btn-primary"}`}>
        {on ? t("people.follow.following") : t("people.follow.button")}
      </button>
      {on && !error && <p className="text-meta text-muted">{t("people.follow.private")}</p>}
      {error && <p role="alert" className="text-meta text-danger">{error}</p>}
    </div>
  );
}
