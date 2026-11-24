"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPost, type ComposeState } from "@/app/feed-actions";
import GameOptions from "@/components/GameOptions";
import { AddPhotoButton, DraftImages, imagesField, MAX_IMAGES, useAddImages, type DraftImage } from "@/components/feed/ImagePicker";
import { CHARACTERS } from "@/lib/characters";
import { keepValuesOnSubmit } from "@/lib/forms";
import { FLAIRS, THREAD_MAX_LENGTH, THREAD_TITLE_MAX, type FeedGame, type Flair } from "@/lib/postConstants";
import { flairKey } from "@/components/feed/flairKey";
import { useT } from "@/lib/i18n/client";

const DRAFT_KEY = "smashy-draft:thread";

/** Start a discussion: a title, a flair, a game (and character/matchup), and a longer post. */
export default function ThreadComposer({ defaultGame = "general", defaultCharacter = "", defaultVs = "", defaultFlair = "discussion" }: { defaultGame?: FeedGame; defaultCharacter?: string; defaultVs?: string; defaultFlair?: Flair }) {
  const t = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [flair, setFlair] = useState<Flair>(defaultFlair);
  const [game, setGame] = useState<FeedGame>(defaultGame);
  const [character, setCharacter] = useState(defaultCharacter);
  const [vs, setVs] = useState(defaultVs);
  const [spoiler, setSpoiler] = useState(false);
  const [images, setImages] = useState<DraftImage[]>([]);
  const addImages = useAddImages(images, setImages);
  const uploading = images.some((i) => i.status === "uploading");
  const [state, action, pending] = useActionState<ComposeState, FormData>(createPost, {});

  // Keep the draft in this browser so a refresh doesn't lose a long post.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as { title?: string; body?: string } | null;
      if (saved) void Promise.resolve().then(() => {
        setTitle((t) => t || saved.title || "");
        setBody((b) => b || saved.body || "");
      });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (title.trim() || body.trim()) window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body }));
      else window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [title, body]);

  // Once per posted thread (round 809). The app keeps this page as it was when you leave it, so on
  // coming back to "New thread" the posted thread's id was still here and this sent you to that thread
  // again instead of showing the form (Matthew, 2026-11-24). The form is also emptied for the next one.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!state.postId || opened.current === state.postId) return;
    opened.current = state.postId;
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
    void Promise.resolve().then(() => {
      setTitle("");
      setBody("");
      setImages([]);
      setSpoiler(false);
    });
    router.push(`/post/${state.postId}`);
  }, [state.postId, router]);

  const chars = game === "general" ? [] : CHARACTERS[game];
  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-4 p-4">
      <input type="hidden" name="images" value={imagesField(images)} />
      {spoiler && <input type="hidden" name="spoiler" value="on" />}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t("feed.thread.title")}</span>
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={THREAD_TITLE_MAX} required minLength={3} placeholder={t("feed.thread.titlePlaceholder")} className="field text-base" />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">{t("feed.thread.flair")}</legend>
        <div className="flex flex-wrap gap-2">
          {FLAIRS.map((f) => (
            <label key={f.key} className="chip">
              <input type="radio" name="flair" value={f.key} checked={flair === f.key} onChange={() => setFlair(f.key)} className="sr-only" />
              {t(flairKey(f.key))}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <select name="game" value={game} onChange={(e) => { setGame(e.target.value as FeedGame); setCharacter(""); setVs(""); }} aria-label={t("feed.compose.game")} className="field w-auto py-1.5">
          <option value="general">{t("feed.tab.general")}</option>
          <GameOptions />
        </select>
        {chars.length > 0 && (
          <select name="character" value={character} onChange={(e) => { setCharacter(e.target.value); if (e.target.value === vs) setVs(""); }} aria-label={t("feed.compose.character")} className="field w-auto py-1.5">
            <option value="">{t("feed.thread.characterOptional")}</option>
            {chars.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        )}
        {character && (
          <select name="vs_character" value={vs} onChange={(e) => setVs(e.target.value)} aria-label={t("feed.thread.matchupAgainst")} className="field w-auto py-1.5">
            <option value="">{t("feed.thread.vsOptional")}</option>
            {chars.filter((c) => c.key !== character).map((c) => <option key={c.key} value={c.key}>vs {c.name}</option>)}
          </select>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t("feed.thread.post")}</span>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={THREAD_MAX_LENGTH}
          rows={10}
          required
          placeholder={t("feed.thread.bodyPlaceholder")}
          className="field resize-y text-base"
        />
        <span className={`self-end text-xs ${THREAD_MAX_LENGTH - body.length < 200 ? "text-brand" : "text-muted"}`}>{THREAD_MAX_LENGTH - body.length}</span>
      </label>

      <DraftImages images={images} setImages={setImages} />
      <div className="flex flex-wrap items-center gap-2">
        <AddPhotoButton full={images.length >= MAX_IMAGES} onFiles={addImages} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="h-4 w-4" />
          {t("feed.thread.spoiler")}
        </label>
        {spoiler && <span className="w-full text-meta text-muted">{t("feed.thread.spoilerNote")}</span>}
        <button disabled={pending || uploading || title.trim().length < 3 || !body.trim()} className="btn btn-md btn-primary ml-auto">
          {pending ? t("share.posting") : uploading ? t("feed.compose.addingPhotos") : t("feed.thread.postThread")}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <p className="text-meta text-muted">{t("feed.thread.rules")}</p>
    </form>
  );
}
