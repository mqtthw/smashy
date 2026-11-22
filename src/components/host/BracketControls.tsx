"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetBracket, startBracket } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

/** Host: start the bracket from the seeding, or throw it away to start again. */
export default function BracketControls({ eventId, started, finished = false, readyCount, checkIn, teams = false }: { eventId: string; started: boolean; finished?: boolean; readyCount: number; checkIn: boolean; teams?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const who = t(
    checkIn ? (teams ? "hostbracket.controls.checkedInTeams" : "hostbracket.controls.checkedInPlayers") : teams ? "hostbracket.controls.teams" : "hostbracket.controls.players",
    { n: readyCount },
  );

  if (started) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/host/${eventId}/bracket`} className="btn btn-md btn-primary">{finished ? t("event.seeBracket") : t("hostbracket.controls.run")}</Link>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            window.confirm(t("hostbracket.controls.resetConfirm")) &&
            start(async () => {
              const res = await resetBracket(eventId);
              setError(res.error ?? null);
            })
          }
          className="btn btn-sm btn-ghost text-danger"
        >
          {t("hostbracket.controls.reset")}
        </button>
        {error && <p className="w-full text-sm text-danger">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending || readyCount < 2}
        onClick={() =>
          window.confirm(t("hostbracket.controls.startConfirm", { who })) &&
          start(async () => {
            const res = await startBracket(eventId);
            if (res.error) setError(res.error);
            else router.push(`/host/${eventId}/bracket`);
          })
        }
        className="btn btn-md btn-primary self-start"
      >
        {pending ? t("hostbracket.controls.starting") : t("hostbracket.controls.start", { who })}
      </button>
      {readyCount < 2 && (
        <p className="text-meta text-muted">
          {checkIn
            ? t(teams ? "hostbracket.controls.needCheckInTeams" : "hostbracket.controls.needCheckIn")
            : t(teams ? "hostbracket.controls.needSignUpTeams" : "hostbracket.controls.needSignUp")}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
