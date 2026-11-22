"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";
import { runAction } from "@/components/ui/Toaster";
import { getMySceneEmojis, toggleReaction } from "@/app/feed-actions";
import { ALL_REACTIONS, MAX_REACTIONS_PER_POST, QUICK_REACTIONS, type ReactionSummary, type SceneEmoji } from "@/lib/reactions";
import { useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

function Glyph({ r, size = 18 }: { r: Pick<ReactionSummary, "key" | "scene">; size?: number }) {
  if (r.scene) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={r.scene.url} alt={`:${r.scene.name}:`} title={`:${r.scene.name}:`} width={size} height={size} className="inline-block object-contain" />;
  }
  return <span aria-hidden="true">{r.key}</span>;
}

type Update = { key: string; on: boolean; scene?: { name: string; url: string } | null };

/** Discord-style reaction chips under a post, plus a picker. The heart (like) is separate. */
export default function ReactionBar({ postId, reactions, signedIn }: { postId: string; reactions: ReactionSummary[]; signedIn: boolean }) {
  const t = useT();
  // Reactions keep their own state (reacting doesn't reload the feed); new numbers from the page replace them.
  const [list, setList] = useState(reactions);
  const [seen, setSeen] = useState(reactions);
  if (seen !== reactions) {
    setSeen(reactions);
    setList(reactions);
  }
  const apply = (u: Update) =>
    setList((cur) => {
      const found = cur.find((r) => r.key === u.key);
      if (u.on) {
        if (found) return cur.map((r) => (r.key === u.key ? { ...r, count: r.count + 1, mine: true } : r));
        return [...cur, { key: u.key, count: 1, mine: true, scene: u.scene ?? null }];
      }
      return cur.flatMap((r) => (r.key !== u.key ? [r] : r.count > 1 ? [{ ...r, count: r.count - 1, mine: false }] : []));
    });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sceneEmojis, setSceneEmojis] = useState<SceneEmoji[] | null>(null);
  const box = useDismiss(open, () => setOpen(false));
  const mineCount = list.filter((r) => r.mine).length;

  useEffect(() => {
    if (open && sceneEmojis === null) void getMySceneEmojis().then(setSceneEmojis);
  }, [open, sceneEmojis]);

  const react = (key: string, on: boolean, scene?: { name: string; url: string } | null) => {
    if (on && mineCount >= MAX_REACTIONS_PER_POST && !list.find((r) => r.key === key)?.mine) {
      setError(t("feed.react.max", { n: MAX_REACTIONS_PER_POST }));
      return;
    }
    setOpen(false);
    setError(null);
    const before = list;
    apply({ key, on, scene });
    startTransition(async () => {
      // A server "no" (e.g. not a member of that scene) shows under the reactions; no connection shows a notice.
      // Either way the chip goes back.
      let refused = false;
      const ok = await runAction(async () => {
        const res = await toggleReaction(postId, key, on);
        if (res.error) {
          refused = true;
          setError(res.error);
        }
      });
      if (!ok || refused) setList(before);
    });
  };

  if (!signedIn && list.length === 0) return null;

  return (
    <div ref={box} className="relative mt-2 flex flex-wrap items-center gap-1.5">
      {list.map((r) =>
        signedIn ? (
          <button
            key={r.key}
            type="button"
            aria-pressed={r.mine}
            aria-label={t(r.mine ? "feed.react.chipMine" : "feed.react.chip", { emoji: r.scene ? `:${r.scene.name}:` : r.key, n: r.count })}
            onClick={() => react(r.key, !r.mine, r.scene)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm ${r.mine ? "border-brand bg-brand/10 text-foreground" : "border-line text-muted hover:bg-surface"}`}
          >
            <Glyph r={r} />
            <span className="font-mono text-meta tabular-nums">{r.count}</span>
          </button>
        ) : (
          <SignInLink key={r.key} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-sm text-muted">
            <Glyph r={r} />
            <span className="font-mono text-meta tabular-nums">{r.count}</span>
          </SignInLink>
        ),
      )}
      {signedIn && (
        <button
          type="button"
          aria-label={t("feed.react.add")}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-sm text-muted hover:bg-surface hover:text-foreground"
        >
          😊<span aria-hidden="true" className="text-meta">+</span>
        </button>
      )}
      {error && <span className="text-meta text-danger">{error}</span>}

      {open && (
        <div role="dialog" aria-label={t("feed.react.pick")} className="absolute top-full left-0 z-10 mt-1 w-72 rounded-xl border border-line bg-background p-2 shadow-lg">
          <div className="flex justify-between border-b border-line pb-2">
            {QUICK_REACTIONS.map((e) => (
              <button key={e} type="button" onClick={() => react(e, !list.find((r) => r.key === e)?.mine)} className="rounded-lg p-1 text-xl hover:bg-surface" aria-label={t("feed.react.react", { emoji: e })}>
                {e}
              </button>
            ))}
          </div>
          <div className="grid max-h-40 grid-cols-8 gap-0.5 overflow-y-auto pt-2">
            {ALL_REACTIONS.slice(QUICK_REACTIONS.length).map((e) => (
              <button key={e} type="button" onClick={() => react(e, !list.find((r) => r.key === e)?.mine)} className="rounded-md p-1 text-lg hover:bg-surface" aria-label={t("feed.react.react", { emoji: e })}>
                {e}
              </button>
            ))}
          </div>
          {sceneEmojis && sceneEmojis.length > 0 && (
            <div className="mt-2 border-t border-line pt-2">
              <p className="mb-1 text-meta text-muted">{t("feed.react.yourScenes")}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {sceneEmojis.map((e) => {
                  const key = `scene:${e.id}`;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      title={`:${e.name}: · ${e.sceneName}`}
                      aria-label={t("feed.react.react", { emoji: `:${e.name}:` })}
                      onClick={() => react(key, !list.find((r) => r.key === key)?.mine, { name: e.name, url: e.url })}
                      className="flex items-center justify-center rounded-md p-1 hover:bg-surface"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.url} alt="" width={22} height={22} className="object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {sceneEmojis && sceneEmojis.length === 0 && (
            <p className="mt-2 border-t border-line pt-2 text-meta text-muted">
              <Link href="/scenes" className="link">{t("feed.react.joinScene")}</Link> {t("feed.react.toUse")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
