"use client";

import { useActionState } from "react";
import { hideStartggPlayer } from "../actions";

/** Hide a start.gg player from player lookup when they ask not to be listed. */
export default function HidePlayerForm() {
  const [state, action, pending] = useActionState(hideStartggPlayer, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="player"
          required
          maxLength={200}
          placeholder="Their player page link, start.gg player id, or start.gg profile link"
          aria-label="Player to hide"
          className="field min-w-0 flex-1 py-1.5"
        />
        <button disabled={pending} className="btn btn-sm btn-danger">{pending ? "Hiding…" : "Hide player"}</button>
      </div>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.done && <p role="status" className="text-sm text-success">{state.done}</p>}
    </form>
  );
}
