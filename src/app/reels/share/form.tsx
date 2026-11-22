"use client";

import { useActionState, useState } from "react";
import GameOptions from "@/components/GameOptions";
import type { GameKey } from "@/lib/games";
import { parseClipLink } from "@/lib/reelLinks";
import { shareClip, type ShareClipState } from "../actions";
import { useT } from "@/lib/i18n/client";

export default function ShareClipForm({ defaultGame }: { defaultGame: GameKey }) {
  const t = useT();
  const [state, action, pending] = useActionState<ShareClipState, FormData>(shareClip, {});
  const [link, setLink] = useState("");
  // Clear the link once it's shared (adjusting state while rendering, as React recommends).
  const [sharedAt, setSharedAt] = useState(state.ok);
  if (state.ok && state.ok !== sharedAt) {
    setSharedAt(state.ok);
    setLink("");
  }
  const parsed = link.trim() ? parseClipLink(link) : null;
  const hint = !link.trim()
    ? t("media.share.hint")
    : parsed
      ? t(parsed.platform === "youtube" ? "media.share.okYouTube" : "media.share.okTwitch")
      : t("media.share.notALink");

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.share.link")}</span>
        <input
          name="link"
          required
          inputMode="url"
          autoComplete="off"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://clips.twitch.tv/…"
          className="field"
          aria-describedby="link-hint"
        />
        <span id="link-hint" className={`text-xs ${link.trim() && !parsed ? "text-danger" : "text-muted"}`}>{hint}</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.share.game")}</span>
        <select name="game" defaultValue={defaultGame} className="field">
          <GameOptions />
        </select>
      </label>
      <button disabled={pending || !parsed} className="btn btn-md btn-primary self-start">
        {pending ? t("media.share.checking") : t("media.share.submit")}
      </button>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-success">{t("media.share.thanks")}</p>}
    </form>
  );
}
