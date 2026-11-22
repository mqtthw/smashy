import LocalTime from "@/components/ui/LocalTime";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { REASON_LABELS, getModerationLog, getOpenLiveReports, getOpenReports } from "@/lib/moderation";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { signMessageImages } from "@/lib/messages";
import { actOnLive, dismissReports, removePost, restorePost } from "../actions";
import { CardListSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };


const ACTION_LABELS = {
  remove_post: "Removed",
  restore_post: "Restored",
  dismiss_reports: "Dismissed reports on",
  remove_chat: "Removed chat message",
  remove_highlight: "Removed highlight",
  hide_reel: "Hid clip",
  remove_message: "Removed message",
  clear_profile: "Cleared profile of",
  close_lobby: "Closed lobby",
  hide_event: "Hid event",
  dismiss_live: "Dismissed reports on",
} as const;

async function Queue() {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const [reports, live, log] = await Promise.all([getOpenReports(), getOpenLiveReports(), getModerationLog()]);
  // Reported private-message photos: short-lived links, for moderators only.
  const photoPath = (snapshot: string) => snapshot.match(/\[photo:([^\]]+)\]/)?.[1] ?? null;
  const photoUrls = await signMessageImages(live.filter((r) => r.kind === "message").map((r) => photoPath(r.snapshot)).filter((p): p is string => !!p));
  const total = reports.reduce((n, r) => n + r.reports.length, 0) + live.reduce((n, r) => n + r.reports.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active="reports" openReports={total} />

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">Chat & lobbies</h2>
        {live.length === 0 && <p className="text-sm text-muted">No open reports.</p>}
        {live.map((r) => (
          <article key={`${r.kind}-${r.targetId}`} className="flex flex-col gap-3 card p-4 text-sm">
            <header className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand/10 text-brand">
                {r.reports.length} report{r.reports.length === 1 ? "" : "s"}
              </span>
              <span className="font-bold">{r.author.tag}</span>
              {r.author.isMinor && <span className="badge border border-line font-normal">Teen account</span>}
              <span className="text-muted">· {r.kind === "chat" ? `Chat (${r.room})` : r.kind === "lobby" ? `Lobby (${r.room})` : r.kind === "reel" ? `Reels clip (${r.room})` : r.kind === "message" ? "Private message" : r.kind === "profile" ? "Profile" : r.kind === "event" ? `Hosted event (${r.room})` : `Highlight (${r.room})`}</span>
            </header>
            <blockquote className="whitespace-pre-wrap break-words rounded-xl bg-surface p-3">{r.snapshot.replace(/\s*\[photo:[^\]]+\]/, "")}</blockquote>
            {r.kind === "message" && photoPath(r.snapshot) && (
              photoUrls.get(photoPath(r.snapshot)!) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrls.get(photoPath(r.snapshot)!)} alt="Reported photo" className="max-h-64 w-auto self-start rounded-lg" />
              ) : (
                <p className="text-meta text-muted">The reported photo was already deleted.</p>
              )
            )}
            <ul className="flex flex-col gap-1">
              {r.reports.map((rep, i) => (
                <li key={i} className="text-muted">
                  <b className="text-foreground">{REASON_LABELS[rep.reason] ?? rep.reason}</b> from {rep.reporter} · {<LocalTime iso={rep.createdAt} style="dateTime" />}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <form action={actOnLive.bind(null, r.kind, r.targetId, "remove", r.reports[0].reason)}>
                <button className="btn btn-sm btn-primary">
                  {r.kind === "chat" ? "Remove message" : r.kind === "lobby" ? "Close lobby" : r.kind === "reel" ? "Hide clip" : r.kind === "message" ? "Remove message" : r.kind === "profile" ? "Reset name, handle, bio & picture" : r.kind === "event" ? "Hide event" : "Remove highlight"}
                </button>
              </form>
              <form action={actOnLive.bind(null, r.kind, r.targetId, "dismiss", undefined)}>
                <button className="rounded-full border border-line px-3 py-1">Dismiss</button>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">Posts</h2>
        {reports.length === 0 && <p className="text-sm text-muted">No open reports.</p>}
        {reports.map((r) => (
          <article key={r.postId} className="flex flex-col gap-3 card p-4 text-sm">
            <header className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand/10 text-brand">
                {r.reports.length} report{r.reports.length === 1 ? "" : "s"}
              </span>
              <span className="font-bold">{r.author.tag}</span>
              {r.author.isMinor && <span className="badge border border-line font-normal">Teen account</span>}
              <span className="text-muted">· {r.context} · {<LocalTime iso={r.createdAt} style="dateTime" />}</span>
              <Link href={r.link} className="ml-auto text-xs text-muted underline">View in context</Link>
            </header>

            <blockquote className="whitespace-pre-wrap break-words rounded-xl bg-surface p-3">{r.body}</blockquote>

            <ul className="flex flex-col gap-1">
              {r.reports.map((rep, i) => (
                <li key={i} className="text-muted">
                  <b className="text-foreground">{REASON_LABELS[rep.reason] ?? rep.reason}</b> from {rep.reporter} · {<LocalTime iso={rep.createdAt} style="dateTime" />}
                  {rep.details && <span className="block pl-3 italic">&ldquo;{rep.details}&rdquo;</span>}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await removePost(r.postId, String(formData.get("reason")));
                }}
                className="flex items-center gap-2"
              >
                <select name="reason" defaultValue={r.reports[0].reason} aria-label="Removal reason" className="field px-2 py-1">
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button className="btn btn-sm btn-primary">Remove post</button>
              </form>
              <form action={dismissReports.bind(null, r.postId)}>
                <button className="rounded-full border border-line px-3 py-1">Keep post (dismiss)</button>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Moderation log</h2>
        <p className="text-xs text-muted">Private. Removed posts are hidden from everyone but kept here for the record.</p>
        {log.length === 0 ? (
          <p className="text-sm text-muted">No decisions yet.</p>
        ) : (
          <ul className="divide-y divide-line card text-sm">
            {log.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5">
                <span className="text-muted">{<LocalTime iso={entry.createdAt} style="dateTime" />}</span>
                <span>
                  <b>{entry.moderator}</b> {(ACTION_LABELS as Record<string, string>)[entry.action] ?? entry.action}
                  {entry.reason && ` (${REASON_LABELS[entry.reason] ?? entry.reason})`}:
                </span>
                <span className="min-w-0 flex-1 truncate text-muted">&ldquo;{entry.postBody ?? "deleted post"}&rdquo;</span>
                {entry.action === "remove_post" && entry.postRemoved && entry.postId && (
                  <form action={restorePost.bind(null, entry.postId)}>
                    <button className="text-xs underline">Undo</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <Queue />
      </Suspense>
    </section>
  );
}
