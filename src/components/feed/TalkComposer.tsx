"use client";

import { useActionState, useState } from "react";
import { POST_MAX_LENGTH } from "@/lib/postConstants";
import { useT } from "@/lib/i18n/client";

type TalkState = { error?: string; ok?: number; mode?: "comment" | "feed" };

/**
 * "Comment" (stays on this page) or "Post to my feed" (shares the thing with your take).
 * Used on set and clip pages; `hidden` carries which thing it is (e.g. { clip_id }).
 */
export default function TalkComposer({
  action: serverAction,
  hidden,
  placeholder,
  thing,
}: {
  action: (prev: TalkState, fd: FormData) => Promise<TalkState>;
  hidden: Record<string, string>;
  placeholder: string;
  thing: string; // "clip", "set"…
}) {
  const t = useT();
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (prev: TalkState, fd: FormData) => {
    const res = await serverAction(prev, fd);
    if (res.ok) setBody("");
    return res;
  }, {});
  const remaining = POST_MAX_LENGTH - body.length;

  return (
    <form action={action} className="flex flex-col gap-2">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label htmlFor="talk-body" className="sr-only">{t("feed.talk.label")}</label>
      <textarea
        id="talk-body"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={POST_MAX_LENGTH}
        rows={3}
        placeholder={placeholder}
        className="field resize-y"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-meta ${remaining < 50 ? "text-danger" : "text-muted"}`}>{remaining}</span>
        <span className="ml-auto flex gap-2">
          <button name="mode" value="feed" disabled={pending || !body.trim()} className="btn btn-md btn-outline">{t("share.postToFeed")}</button>
          <button name="mode" value="comment" disabled={pending || !body.trim()} className="btn btn-md btn-primary">{t("feed.talk.comment")}</button>
        </span>
      </div>
      {state.error && <p className="text-meta text-danger">{state.error}</p>}
      {state.ok && !state.error && (
        <p className="text-meta text-success">{state.mode === "feed" ? t("feed.talk.posted", { thing }) : t("feed.talk.added")}</p>
      )}
    </form>
  );
}
