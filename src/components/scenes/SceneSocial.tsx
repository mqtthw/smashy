"use client";

import { useActionState, useState, useTransition } from "react";
import { setSceneMembership, uploadSceneEmoji } from "@/app/scenes/actions";
import { useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

/** "Join scene" / "Joined ✓", with the member count. */
export function JoinSceneButton({ sceneId, isMember, count, signedIn }: { sceneId: string; isMember: boolean; count: number; signedIn: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = t("media.join.members", { n: count });
  if (!signedIn) {
    return (
      <div className="flex items-center gap-3">
        <SignInLink className="btn btn-md btn-primary">{t("media.join.join")}</SignInLink>
        <span className="text-meta text-muted">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        aria-pressed={isMember}
        onClick={() =>
          start(async () => {
            const res = await setSceneMembership(sceneId, !isMember);
            setError(res.error ?? null);
          })
        }
        className={`btn btn-md ${isMember ? "btn-outline" : "btn-primary"}`}
      >
        {t(isMember ? "media.join.joined" : "media.join.join")}
      </button>
      <span className="text-meta text-muted">{label}</span>
      {isMember && <span className="text-meta text-muted">{t("media.join.canReact")}</span>}
      {error && <span className="text-meta text-danger">{error}</span>}
    </div>
  );
}

/** Scene admins: upload a custom emoji (goes to site admins for approval). */
export function EmojiUploadForm({ sceneId }: { sceneId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(uploadSceneEmoji, {});
  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border border-dashed border-line-strong p-3">
      <input type="hidden" name="scene_id" value={sceneId} />
      <p className="text-meta font-semibold">{t("media.emoji.add")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="emoji-name" className="sr-only">{t("media.emoji.name")}</label>
        <span className="text-muted">:</span>
        <input id="emoji-name" name="name" required pattern="[a-z0-9_]{2,32}" placeholder="satx_hype" className="field w-40 py-1.5" />
        <span className="text-muted">:</span>
        <label htmlFor="emoji-image" className="sr-only">{t("media.emoji.image")}</label>
        <input id="emoji-image" name="image" type="file" required accept="image/png,image/gif,image/webp" className="text-meta" />
        <button disabled={pending} className="btn btn-sm btn-primary">{pending ? t("media.emoji.uploading") : t("media.emoji.submit")}</button>
      </div>
      <p className="text-meta text-muted">
        {t("media.emoji.help")}
      </p>
      {state.error && <p className="text-meta text-danger">{state.error}</p>}
      {state.ok && <p className="text-meta text-success">{t("media.emoji.submitted")}</p>}
    </form>
  );
}
