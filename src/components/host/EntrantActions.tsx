"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { checkInHostedEvent, joinHostedEvent, joinHostedWaitlist, leaveHostedEvent, leaveHostedWaitlist } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";
import { signInPath } from "@/lib/returnTo";

/** Sign up, withdraw and check in, for one event. When it's full: get in line, see your place, or leave the line. */
export default function EntrantActions({
  eventId,
  signedIn,
  joined,
  checkedIn,
  canJoin,
  canWithdraw,
  checkInOpen,
  full,
  asHost = false,
  waiting = null,
  waitlist = 0,
}: {
  eventId: string;
  signedIn: boolean;
  joined: boolean;
  checkedIn: boolean;
  canJoin: boolean; // sign-ups open and the event hasn't started
  canWithdraw: boolean; // until the bracket starts (also after sign-ups close)
  checkInOpen: boolean;
  full: boolean;
  asHost?: boolean; // running this event: the buttons are for playing in it too
  waiting?: number | null; // my place in the waitlist, from 1 (null = not waiting)
  waitlist?: number; // how many people are waiting
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
    });

  if (!signedIn) {
    return canJoin ? <Link href={signInPath(`/host/${eventId}`)} className="btn btn-lg btn-primary btn-hero">{t("entering.signInToEnter")}</Link> : null;
  }
  return (
    <div className="flex flex-col gap-2">
      {!joined && canJoin && !full && waiting === null && (
        <button type="button" disabled={pending} onClick={() => run(() => joinHostedEvent(eventId))} className="btn btn-lg btn-primary btn-hero">
          {pending ? t("entering.signingUp") : asHost ? t("entering.signUpAsHost") : t("entering.signUp")}
        </button>
      )}
      {!joined && canJoin && full && waiting === null && (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => joinHostedWaitlist(eventId))} className="btn btn-lg btn-primary btn-hero">
            {pending ? t("entering.joiningWaitlist") : t("entering.joinWaitlist")}
          </button>
          <p className="text-sm text-muted">
            {waitlist > 0 ? t("entering.fullNoteWaiting", { n: waitlist }) : t("entering.fullNote")}
          </p>
        </>
      )}
      {!joined && waiting !== null && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">
            {waitlist > 1 ? t("entering.waitlistPlaceOf", { place: waiting, n: waitlist }) : t("entering.waitlistPlace", { place: waiting })}
          </span>
          <span className="text-muted">{t("entering.waitlistNote")}</span>
          <button type="button" disabled={pending} onClick={() => run(() => leaveHostedWaitlist(eventId))} className="text-muted underline">
            {t("entering.leaveWaitlist")}
          </button>
        </div>
      )}
      {joined && checkInOpen && !checkedIn && (
        <button type="button" disabled={pending} onClick={() => run(() => checkInHostedEvent(eventId))} className="btn btn-lg btn-primary btn-hero">
          {pending ? t("entering.checkingIn") : t("entering.checkInNow")}
        </button>
      )}
      {joined && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">{checkedIn ? t("entering.checkedIn") : t("entering.signedUp")}</span>
          {canWithdraw && (
            <button
              type="button"
              disabled={pending}
              onClick={() => window.confirm(t("entering.withdrawConfirm")) && run(() => leaveHostedEvent(eventId))}
              className="text-muted underline"
            >
              {t("entering.withdraw")}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
