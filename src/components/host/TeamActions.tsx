"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { checkInHostedTeam, joinHostedTeam, leaveHostedTeam } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";
import { signInPath } from "@/lib/returnTo";

/**
 * Doubles: sign up as a team (you and a partner), check the team in, or leave. The partner is typed
 * as "@handle" (someone on Smashy: they're told, and can leave) or as a plain name (no account).
 */
export default function TeamActions({
  eventId,
  signedIn,
  team,
  checkedIn,
  canJoin,
  canWithdraw,
  checkInOpen,
  full,
  asHost = false,
}: {
  eventId: string;
  signedIn: boolean;
  team: string | null; // the name of the team you're on ("You / Partner"), if any
  checkedIn: boolean;
  canJoin: boolean; // sign-ups open
  canWithdraw: boolean; // until the bracket starts
  checkInOpen: boolean;
  full: boolean;
  asHost?: boolean; // running this event: the form is for playing in it too
}) {
  const t = useT();
  const [partner, setPartner] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else after?.();
    });

  if (!signedIn) {
    return canJoin ? <Link href={signInPath(`/host/${eventId}`)} className="btn btn-lg btn-primary">{t("entering.signInToEnter")}</Link> : null;
  }
  return (
    <div className="flex flex-col gap-2">
      {!team && canJoin && (
        <form
          className="card flex flex-col gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (partner.trim()) run(() => joinHostedTeam(eventId, partner), () => setPartner(""));
          }}
        >
          <label htmlFor="team-partner" className="font-semibold">
            {asHost ? t("entering.teamSignUpAsHost") : t("entering.teamSignUp")}
          </label>
          <p className="text-meta text-muted">
            {t("entering.teamHelpBefore")} <b>{t("entering.teamHelpHandle")}</b> {t("entering.teamHelpAfter")}
          </p>
          <div className="flex gap-2">
            <input
              id="team-partner"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              maxLength={32}
              placeholder={t("entering.partnerPlaceholder")}
              autoComplete="off"
              className="field min-w-0 flex-1"
            />
            <button type="submit" disabled={pending || full || !partner.trim()} className="btn btn-md btn-primary">
              {full ? t("entering.eventFull") : pending ? t("entering.signingUp") : t("entering.signUp")}
            </button>
          </div>
        </form>
      )}
      {team && checkInOpen && !checkedIn && (
        <button type="button" disabled={pending} onClick={() => run(() => checkInHostedTeam(eventId))} className="btn btn-lg btn-primary">
          {pending ? t("entering.checkingIn") : t("entering.checkTeamIn")}
        </button>
      )}
      {team && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">
            {checkedIn ? t("entering.teamCheckedIn", { team }) : t("entering.teamSignedUp", { team })}
          </span>
          {canWithdraw && (
            <button
              type="button"
              disabled={pending}
              onClick={() => window.confirm(t("entering.leaveTeamConfirm")) && run(() => leaveHostedTeam(eventId))}
              className="text-muted underline"
            >
              {t("entering.leaveTeam")}
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
