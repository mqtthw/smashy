"use client";

import { useActionState } from "react";
import { addChannel } from "../actions";

/** Approve a Twitch channel for Reels. */
export default function AddChannelForm() {
  const [state, action, pending] = useActionState(addChannel, {});
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <label htmlFor="reel-channel" className="sr-only">Twitch channel</label>
        <input id="reel-channel" name="channel" required placeholder="twitch.tv/channel or channel name" className="field min-w-0 flex-1" />
        <button disabled={pending} className="btn btn-md btn-primary shrink-0">{pending ? "Adding…" : "Approve channel"}</button>
      </div>
      {state.error && <p className="text-danger">{state.error}</p>}
      {state.ok && <p className="text-success">Approved. Its clips will show up within a minute.</p>}
    </form>
  );
}
