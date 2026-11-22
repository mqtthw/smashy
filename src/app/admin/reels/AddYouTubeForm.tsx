"use client";

import { useActionState } from "react";
import { GAMES, GAME_KEYS } from "@/lib/games";
import { addYouTube } from "../actions";

/** Approve a YouTube channel for Reels, with the game it usually posts (optional). */
export default function AddYouTubeForm({ ready }: { ready: boolean }) {
  const [state, action, pending] = useActionState(addYouTube, {});
  if (!ready) {
    return (
      <p className="text-meta text-muted">
        YouTube Shorts are off: add a <code>YOUTUBE_API_KEY</code> to the server&apos;s settings to turn them on.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="yt-channel" className="sr-only">YouTube channel</label>
        <input id="yt-channel" name="channel" required placeholder="youtube.com/@channel or @handle" className="field min-w-0 flex-1 basis-48" />
        <label htmlFor="yt-game" className="sr-only">Usual game</label>
        <select id="yt-game" name="game" defaultValue="" className="field shrink-0">
          <option value="">Game: from titles</option>
          {GAME_KEYS.map((g) => (
            <option key={g} value={g}>Mostly {GAMES[g].short}</option>
          ))}
        </select>
        <button disabled={pending} className="btn btn-md btn-primary shrink-0">{pending ? "Adding…" : "Approve YouTube channel"}</button>
      </div>
      {state.error && <p className="text-danger">{state.error}</p>}
      {state.ok && <p className="text-success">Approved. Its Shorts will show up within a minute.</p>}
    </form>
  );
}
