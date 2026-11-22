"use client";

import { useActionState } from "react";
import { deleteMyAccount, type DeleteState } from "./actions";
import { useT } from "@/lib/i18n/client";

export default function DeleteAccountForm({ handle }: { handle: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteMyAccount, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("people.delete.confirm")} <span className="font-mono">{handle}</span></span>
        <input name="confirm" required autoComplete="off" autoCapitalize="none" spellCheck={false} className="field" />
      </label>
      <button disabled={pending} className="btn btn-md btn-danger self-start">
        {pending ? t("people.delete.deleting") : t("people.delete.button")}
      </button>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
    </form>
  );
}
