"use client";

// "Change email" under How you sign in (round 685). Supabase's "Secure email change" is on, so the change
// needs the link sent to the old address and the one sent to the new address; the page says so.
import { useActionState, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { changeEmail, type ChangeEmailState } from "./signin-methods-actions";

export default function ChangeEmail({ current }: { current: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ChangeEmailState, FormData>(changeEmail, {});

  if (state.sentTo) {
    return <p role="status" className="text-sm text-muted">{t("people.signin.emailSent", { old: current, new: state.sentTo })}</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="link self-start text-meta">
        {t("people.signin.changeEmail")}
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="new-email" className="text-sm text-muted">{t("people.signin.newEmail")}</label>
      <div className="flex gap-2">
        <input id="new-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="field min-w-0 flex-1" />
        <button disabled={pending} className="shrink-0 btn btn-md btn-outline">{t("people.signin.sendLinks")}</button>
      </div>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
