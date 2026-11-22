"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/client";

// The reply box loads when someone first taps Reply (round 569), not with every thread.
const PostComposer = dynamic(() => import("@/components/feed/PostComposer"));

/** One reply in a thread, with a "Reply" button that opens a reply box right under it. */
export default function ReplyShell({
  card,
  threadId,
  replyId,
  replyToTag,
  signedIn,
  children,
}: {
  card: React.ReactNode;
  threadId: string;
  replyId: string;
  replyToTag: string;
  signedIn: boolean;
  children?: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div>
      {card}
      {signedIn && (
        <div className="-mt-2 pb-2 pl-[4.25rem]">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-meta font-semibold text-muted hover:text-foreground">
            {open ? t("common.cancel") : t("feed.compose.reply")}
          </button>
        </div>
      )}
      {open && (
        <div className="ml-12 rounded-xl border border-line">
          <PostComposer parentId={threadId} replyTo={replyId} placeholder={t("feed.post.replyTo", { name: replyToTag })} onPosted={() => setOpen(false)} />
        </div>
      )}
      {children}
    </div>
  );
}
