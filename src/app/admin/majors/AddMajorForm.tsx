"use client";

import { useActionState } from "react";
import { addMajor } from "../actions";

/** Paste a start.gg or parry.gg link to feature that tournament as a major. */
export default function AddMajorForm() {
  const [state, action, pending] = useActionState(addMajor, {});
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <label htmlFor="major-link" className="sr-only">start.gg or parry.gg tournament link</label>
        <input
          id="major-link"
          name="link"
          required
          placeholder="https://www.start.gg/tournament/… or https://parry.gg/…"
          className="field min-w-0 flex-1"
        />
        <button disabled={pending} className="btn btn-md btn-primary shrink-0">{pending ? "Adding…" : "Add major"}</button>
      </div>
      {state.error && <p className="text-danger">{state.error}</p>}
      {state.ok && <p className="text-success">Added.</p>}
    </form>
  );
}
