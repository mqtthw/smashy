import PostCard from "@/components/feed/PostCard";
import type { ReplyNode } from "@/lib/threadRank";
import ReplyShell from "./ReplyShell";
import { T } from "@/lib/i18n/client";

const MAX_INDENT = 5; // deeper replies stop indenting, so they stay readable on phones

/** Replies as a tree: each answer sits under the reply it answers, and long branches can be folded. */
export default function ReplyTree({ nodes, threadId, now, viewerId, depth = 0 }: { nodes: ReplyNode[]; threadId: string; now: number; viewerId: string | null; depth?: number }) {
  return (
    <ul className={depth > 0 && depth <= MAX_INDENT ? "ml-4 border-l-2 border-line sm:ml-6" : ""}>
      {nodes.map((n) => (
        <li key={n.post.id} className={depth === 0 ? "border-b border-line" : ""}>
          <ReplyShell
            card={<PostCard post={n.post} now={now} viewerId={viewerId} />}
            threadId={threadId}
            replyId={n.post.id}
            replyToTag={n.post.author.tag}
            signedIn={!!viewerId}
          >
            {n.children.length > 0 && (
              <details open className="group">
                <summary className="cursor-pointer list-none pb-2 pl-[4.25rem] text-meta font-semibold text-muted hover:text-foreground">
                  <span className="group-open:hidden"><T k="feed.replies.show" values={{ n: n.size }} /></span>
                  <span className="hidden group-open:inline"><T k="feed.replies.hide" values={{ n: n.size }} /></span>
                </summary>
                <ReplyTree nodes={n.children} threadId={threadId} now={now} viewerId={viewerId} depth={depth + 1} />
              </details>
            )}
          </ReplyShell>
        </li>
      ))}
    </ul>
  );
}
