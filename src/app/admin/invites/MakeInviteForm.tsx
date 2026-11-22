"use client";

import { useActionState, useSyncExternalStore } from "react";
import { showToast } from "@/components/ui/Toaster";
import { makeInvite } from "../actions";

const noop = () => () => {};

/** Make a code: one use for a person, or more for a group (e.g. your weekly's Discord). */
export default function MakeInviteForm() {
  const [state, action, pending] = useActionState(makeInvite, {});
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const link = state.code ? `${origin}/invite/${state.code}` : "";
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-1 basis-48 flex-col gap-1">
          <span className="font-semibold">Who is it for? (just for you)</span>
          <input name="note" maxLength={80} placeholder="e.g. SA weekly Discord" className="field" />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="font-semibold">Uses</span>
          <input name="uses" type="number" min={1} max={500} defaultValue={1} className="field" />
        </label>
      </div>
      <button disabled={pending} className="btn btn-md btn-primary self-start">{pending ? "Making…" : "Make invite code"}</button>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      {state.code && (
        <div className="flex flex-col gap-1 rounded-lg bg-surface p-3">
          <p>
            Code: <b className="font-mono">{state.code}</b>
          </p>
          <p className="break-all text-muted">Invite link: {link}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(link).then(() => showToast("Invite link copied"))}
            className="btn btn-sm btn-outline self-start"
          >
            Copy invite link
          </button>
        </div>
      )}
    </form>
  );
}
