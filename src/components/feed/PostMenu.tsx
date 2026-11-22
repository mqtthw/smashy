"use client";

import { useState, useTransition } from "react";
import { useSharedPostState } from "@/lib/sharedPostState";
import { usePathname, useRouter } from "next/navigation";
import { deletePost, dismissPost, editPost, reportPost, setPinnedPost, setPostGame, toggleBookmark } from "@/app/feed-actions";
import GameOptions from "@/components/GameOptions";
import { GAMES, isGameKey } from "@/lib/games";
import { POST_MAX_LENGTH } from "@/lib/postConstants";
import { runAction, showToast } from "@/components/ui/Toaster";
import { useDismiss } from "@/lib/useDismiss";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

const REASONS: { value: string; label: MessageKey }[] = [
  { value: "spam", label: "report.spam" },
  { value: "harassment", label: "report.harassment" },
  { value: "inappropriate", label: "feed.menu.inappropriate" },
  { value: "off_topic", label: "report.offTopic" },
  { value: "other", label: "report.other" },
];

/** "..." menu: save, pin (yours), delete (yours), or not interested / report (someone else's). */
export default function PostMenu({
  postId,
  isMine,
  afterDelete,
  saved = false,
  pinned = false,
  canPin = false,
  editableBody = null,
  editMax = POST_MAX_LENGTH,
  game = null,
}: {
  postId: string;
  isMine: boolean;
  afterDelete?: string;
  saved?: boolean;
  pinned?: boolean;
  canPin?: boolean;
  editableBody?: string | null; // your post, still within its 15-minute edit window
  editMax?: number; // 500 for posts, more for discussion threads
  game?: string | null; // your top-level post's game ("general" or a game key): offers "Change game"
}) {
  const t = useT();
  const [open, setOpen] = useState<null | "menu" | "report" | "edit" | "game">(null);
  const [newGame, setNewGame] = useState(game ?? "general");
  const [draft, setDraft] = useState(editableBody ?? "");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const box = useDismiss(open !== null, () => setOpen(null));
  // Saving keeps its own state (no page reload, so a ranked feed doesn't reshuffle); only the Saved
  // page reloads, so an unsaved post drops out of the list.
  // Shared by every copy of the post on screen (the Feed's game tabs, round 638).
  const [isSaved, setIsSaved] = useSharedPostState(`save:${postId}`, saved);
  const pathname = usePathname();
  const router = useRouter();

  if (result) return <span className="text-xs text-muted">{result}</span>;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={t("feed.menu.more")}
        aria-expanded={open !== null}
        onClick={() => setOpen(open ? null : "menu")}
        className="-my-2 rounded-full px-3 py-2 text-muted hover:bg-surface hover:text-foreground"
      >
        ⋯
      </button>

      {open === "menu" && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-line bg-background p-1 text-sm shadow-lg">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (await runAction(() => toggleBookmark(postId, !isSaved))) {
                  showToast(isSaved ? t("feed.menu.removedSaved") : t("feed.menu.saved"));
                  setIsSaved(!isSaved);
                  if (pathname.startsWith("/saved")) router.refresh();
                }
                setOpen(null);
              })
            }
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface"
          >
            {isSaved ? t("feed.menu.unsave") : t("feed.menu.save")}
          </button>
          {isMine && canPin && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (await runAction(() => setPinnedPost(pinned ? null : postId))) showToast(pinned ? t("feed.menu.unpinned") : t("feed.menu.pinned"));
                  setOpen(null);
                })
              }
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface"
            >
              {pinned ? t("feed.menu.unpin") : t("feed.menu.pin")}
            </button>
          )}
          {isMine && editableBody !== null && (
            <button type="button" onClick={() => setOpen("edit")} className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface">
              {t("feed.menu.edit")}
            </button>
          )}
          {isMine && game !== null && (
            <button type="button" onClick={() => { setNewGame(game); setOpen("game"); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface">
              {t("feed.menu.changeGame")}
            </button>
          )}
          {isMine ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(t("feed.menu.deleteConfirm"))) return;
                startTransition(async () => {
                  await runAction(() => deletePost(postId, afterDelete));
                });
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-danger hover:bg-surface"
            >
              {t("feed.menu.delete")}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const ok = await runAction(() => dismissPost(postId));
                    setOpen(null);
                    if (!ok) return;
                    // In a list, the post just goes away (no reload, so For You doesn't reshuffle);
                    // on the post's own page, the menu says so instead.
                    const card = pathname.startsWith("/post/") ? null : box.current?.closest("article");
                    if (card instanceof HTMLElement) {
                      // Keyboard focus was on this menu: move it to the next post (or the page) rather
                      // than letting it fall back to the top of the page.
                      const posts = [...document.querySelectorAll("article")];
                      const next = posts.slice(posts.indexOf(card) + 1).find((a) => !a.closest("[hidden]")); // not in a hidden game tab (round 630)
                      card.hidden = true;
                      const target = next?.querySelector<HTMLElement>("a[href], button") ?? document.querySelector<HTMLElement>("main");
                      if (target && !target.hasAttribute("tabindex") && target.tagName === "MAIN") target.setAttribute("tabindex", "-1");
                      target?.focus();
                      showToast(t("feed.menu.dismissed"));
                    } else setResult(t("feed.menu.dismissed"));
                  })
                }
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface"
              >
                {t("feed.menu.notInterested")}
              </button>
              <button type="button" onClick={() => setOpen("report")} className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface">
                {t("feed.menu.report")}
              </button>
            </>
          )}
        </div>
      )}

      {open === "edit" && (
        <div className="absolute right-0 z-10 mt-1 w-80 max-w-[85vw] rounded-xl border border-line bg-background p-3 text-sm shadow-lg">
          <p className="mb-2 font-semibold">{t("feed.menu.edit")}</p>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={editMax} rows={editMax > POST_MAX_LENGTH ? 12 : 4} className="w-full field resize-y p-2" aria-label={t("feed.menu.postText")} />
          <p className="mt-1 text-meta text-muted">{t("feed.menu.editNote")}</p>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(null)} className="px-3 py-1 text-muted">{t("common.cancel")}</button>
            <button
              type="button"
              disabled={pending || !draft.trim() || draft === editableBody}
              onClick={() =>
                startTransition(async () => {
                  if (await runAction(() => editPost(postId, draft))) setOpen(null);
                })
              }
              className="btn btn-sm btn-primary"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      )}

      {open === "game" && (
        <div className="absolute right-0 z-10 mt-1 w-72 max-w-[85vw] rounded-xl border border-line bg-background p-3 text-sm shadow-lg">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t("feed.menu.changeGame")}</span>
            <select value={newGame} onChange={(e) => setNewGame(e.target.value)} className="field py-1.5">
              <option value="general">{t("feed.tab.general")}</option>
              <GameOptions />
            </select>
          </label>
          <p className="mt-1 text-meta text-muted">{t("feed.menu.changeGameNote")}</p>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(null)} className="px-3 py-1 text-muted">{t("common.cancel")}</button>
            <button
              type="button"
              disabled={pending || newGame === game}
              onClick={() =>
                startTransition(async () => {
                  if (await runAction(() => setPostGame(postId, newGame))) {
                    showToast(t("feed.menu.gameChanged", { game: isGameKey(newGame) ? GAMES[newGame].short : t("feed.tab.general") }));
                    setOpen(null);
                  }
                })
              }
              className="btn btn-sm btn-primary"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      )}

      {open === "report" && (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded-xl border border-line bg-background p-3 text-sm shadow-lg">
          <p className="mb-2 font-semibold">{t("feed.menu.why")}</p>
          <div className="flex flex-col gap-1">
            {REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2">
                <input type="radio" name={`reason-${postId}`} value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                {t(r.label)}
              </label>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t("feed.menu.anythingElse")}
            className="mt-2 w-full field p-2"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(null)} className="px-3 py-1 text-muted">{t("common.cancel")}</button>
            <button
              type="button"
              disabled={!reason || pending}
              onClick={() =>
                startTransition(async () => {
                  // On failure a notice says why and the form stays open to try again.
                  if (await runAction(() => reportPost(postId, reason, details))) setResult(t("feed.menu.reported"));
                })
              }
              className="btn btn-sm btn-inverse"
            >
              {t("report.button")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
