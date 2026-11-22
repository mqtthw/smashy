"use client";

import GameOptions from "@/components/GameOptions";

import { useActionState, useEffect, useRef, useState } from "react";
import { AddPhotoButton, DraftImages, imageFiles, MAX_IMAGES, useAddImages, type DraftImage } from "./ImagePicker";
import { AddVideoButton, DraftVideosView, videoBusy, type DraftVideo } from "./VideoPicker";
import { MAX_POST_VIDEOS } from "@/lib/postMedia";
import { firstClipLinkIn } from "@/lib/reelLinks";

/** What the post form sends: the finished photos and videos, in the order they were added. */
const mediaField = (images: DraftImage[], videos: DraftVideo[]) =>
  JSON.stringify(
    [
      ...images.filter((i) => i.status === "ready" && i.id).map((i) => ({ at: i.at, m: { kind: "image", id: i.id, alt: i.alt } })),
      ...videos.filter((v) => v.status === "ready" && v.id).map((v) => ({ at: v.at, m: { kind: "video", id: v.id } })),
    ]
      .sort((a, b) => a.at - b.at)
      .map((x) => x.m),
  );
import { createPost, createTemplatePost, suggestHandles, type ComposeState } from "@/app/feed-actions";
import { askForReviewAfterWin } from "@/lib/appReview";
import Avatar from "@/components/ui/Avatar";
import { keepValuesOnSubmit } from "@/lib/forms";
import { formatEventDate } from "@/lib/format";
import { CHARACTERS, characterName } from "@/lib/characters";
import { GAMES } from "@/lib/games";
import { characterFromText } from "@/lib/hashtags";
import { POLL_LENGTHS, POLL_MAX_OPTION, POST_MAX_LENGTH, type FeedGame } from "@/lib/postConstants";
import type { HistoryEntry } from "@/lib/startgg";
import Icon from "@/components/ui/Icon";
import { useLang, useT } from "@/lib/i18n/client";
import type { Lang, MessageKey } from "@/lib/i18n/base";
import { ordinalFor } from "@/lib/i18n/ordinal";

type Translate = ReturnType<typeof useT>;

type Template = { kind: "placed" | "signed_up"; entry: HistoryEntry };

// The starting text is the person's own post, written in their language (they can edit it).
function templateText({ kind, entry }: Template, t: Translate, lang: Lang) {
  if (kind !== "placed") return t("feed.compose.signedUp", { event: entry.tournamentName });
  const place = ordinalFor(lang, entry.placement!);
  return entry.numEntrants
    ? t("feed.compose.placedOf", { place, n: entry.numEntrants, event: entry.tournamentName })
    : t("feed.compose.placed", { place, event: entry.tournamentName });
}

const POLL_LENGTH_KEYS: Record<number, MessageKey> = { 1: "feed.poll.1h", 24: "feed.poll.1d", 72: "feed.poll.3d", 168: "feed.poll.1w" };

/**
 * Write a post or a reply. On the main feed, people with a linked start.gg account
 * also get one-tap "Share a result" / "I signed up" templates.
 */
export default function PostComposer({
  parentId,
  replyTo,
  rulesetId,
  quoteOf,
  onPosted,
  defaultGame = "general",
  results: givenResults,
  signups: givenSignups,
  templates,
  placeholder,
}: {
  parentId?: string;
  replyTo?: string; // replying to a reply inside a thread
  rulesetId?: string; // posting into a ruleset's discussion
  quoteOf?: string; // quoting another post
  onPosted?: () => void;
  defaultGame?: FeedGame;
  results?: HistoryEntry[];
  signups?: HistoryEntry[];
  /** The "share a result" choices, still on their way from start.gg (round 554): the Feed shows at
   * once and the buttons appear when these arrive, instead of the whole Feed waiting for them. */
  templates?: Promise<{ results: HistoryEntry[]; signups: HistoryEntry[] }> | null;
  placeholder?: string;
}) {
  const t = useT();
  const [arrived, setArrived] = useState<{ results: HistoryEntry[]; signups: HistoryEntry[] } | null>(null);
  useEffect(() => {
    let alive = true;
    // A promise sent from the server arrives as React's own "thenable", whose .then returns nothing, so
    // .then(…).catch(…) on it crashed the Feed (rounds 554-555). Promise.resolve turns it into a real one.
    if (templates) Promise.resolve(templates).then((v) => alive && setArrived(v)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [templates]);
  const results = givenResults ?? arrived?.results ?? [];
  const signups = givenSignups ?? arrived?.signups ?? [];
  const lang = useLang();
  const [template, setTemplate] = useState<Template | null>(null);
  const [picker, setPicker] = useState<null | "placed" | "signed_up">(null);
  const [body, setBody] = useState("");
  const [game, setGameState] = useState<FeedGame>(defaultGame);
  const [character, setCharacter] = useState("");
  // The game follows the Feed tab you're on (round 721). Switching tabs keeps this same composer on
  // screen, so its first game stuck and had to be picked by hand for every post. A game you picked
  // yourself for a post you've started writing stays until you post it.
  const [tabGame, setTabGame] = useState<FeedGame>(defaultGame);
  const [pickedGame, setPickedGame] = useState(false);
  if (tabGame !== defaultGame) {
    setTabGame(defaultGame);
    if (!pickedGame || !body.trim()) {
      setPickedGame(false);
      setGameState(defaultGame);
      setCharacter(""); // characters differ per game
    }
  }
  const [images, setImages] = useState<DraftImage[]>([]);
  const [videos, setVideos] = useState<DraftVideo[]>([]);
  // A poll (new posts only): null = no poll.
  const [poll, setPoll] = useState<{ options: string[]; hours: number } | null>(null);
  const [spoiler, setSpoiler] = useState(false); // hides the post (results) until readers tap it
  // "Also share to Reels" (round 460): offered when a new post links a Twitch clip or YouTube Short.
  const [toReels, setToReels] = useState(true);
  const canPoll = !parentId && !rulesetId && !quoteOf;

  // @mention suggestions: when the word before the cursor starts with @, suggest people.
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ start: number; end: number; people: { tag: string; handle: string; avatarUrl: string | null }[] } | null>(null);
  const mentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionAsk = useRef(0); // only the latest lookup's answer is shown (round 630)
  const lookForMention = (text: string, caret: number) => {
    const m = text.slice(0, caret).match(/(?:^|[^\w&])@([A-Za-z0-9_]{1,20})$/);
    if (mentionTimer.current) clearTimeout(mentionTimer.current);
    const ask = ++mentionAsk.current;
    if (!m) return setMention(null);
    const start = caret - m[1].length - 1;
    mentionTimer.current = setTimeout(async () => {
      const people = await suggestHandles(m[1]).catch(() => []);
      if (ask === mentionAsk.current) setMention({ start, end: caret, people });
    }, 200);
  };
  const pickMention = (handle: string) => {
    if (!mention) return;
    const next = `${body.slice(0, mention.start)}@${handle} ${body.slice(mention.end)}`;
    setBody(next);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = mention.start + handle.length + 2;
      textarea.current?.focus();
      textarea.current?.setSelectionRange(pos, pos);
    });
  };

  // Drafts: what you're writing is kept in this browser, so a refresh or a closed tab doesn't lose
  // it (one draft per place: the feed, each reply box, each quote).
  const draftKey = `smashy-draft:${replyTo ?? parentId ?? (quoteOf ? `quote:${quoteOf}` : null) ?? rulesetId ?? "feed"}`; // quote: its own draft (round 630)
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(draftKey);
    } catch {}
    if (saved) void Promise.resolve().then(() => setBody((cur) => cur || saved!));
  }, [draftKey]);
  useEffect(() => {
    try {
      if (body.trim() && !template) window.localStorage.setItem(draftKey, body.slice(0, POST_MAX_LENGTH));
      else window.localStorage.removeItem(draftKey);
    } catch {}
  }, [body, draftKey, template]);
  const uploading = images.some((i) => i.status === "uploading");
  const videoUploading = videoBusy(videos);
  const addImages = useAddImages(images, setImages, videos.length);
  const mediaCount = images.length + videos.length; // up to 4 in any mix, at most 2 videos
  const [dragging, setDragging] = useState(false);
  const setGame = (g: FeedGame) => {
    setGameState(g);
    setCharacter(""); // characters differ per game
  };
  // Show what a hashtag like #SSBU_CLOUD will tag, before posting.
  const tagged = !character ? characterFromText(body, game === "general" ? null : game) : null;
  const [plainState, plainAction, plainPending] = useActionState<ComposeState, FormData>(createPost, {});
  const [tplState, tplAction, tplPending] = useActionState<ComposeState, FormData>(createTemplatePost, {});
  const action = template ? tplAction : plainAction;
  const state = template ? tplState : plainState;
  const pending = plainPending || tplPending;

  // Clear the box after a successful post.
  const lastOk = useRef<number | undefined>(undefined);
  useEffect(() => {
    const ok = plainState.ok ?? 0;
    const ok2 = tplState.ok ?? 0;
    const latest = Math.max(ok, ok2);
    if (latest && latest !== lastOk.current) {
      lastOk.current = latest;
      setBody(""); // clear the box once the server confirms the post
      setTemplate(null);
      setImages([]);
      setVideos([]);
      setPoll(null);
      setSpoiler(false);
      // Back to the tab's game for the next post.
      setPickedGame(false);
      setGameState(defaultGame);
      setCharacter("");
      onPosted?.();
      askForReviewAfterWin(); // a post went up: a good moment to ask for a store rating (round 643)
    }
  }, [plainState.ok, tplState.ok, onPosted, defaultGame]);

  const choose = (picked: Template) => {
    setTemplate(picked);
    setBody(templateText(picked, t, lang));
    setPicker(null);
  };

  const remaining = POST_MAX_LENGTH - body.length;
  const options = picker === "placed" ? results : signups;

  return (
    <form
      action={action}
      onSubmit={keepValuesOnSubmit(action)}
      // Drop photos anywhere on the box (desktop).
      onDragOver={(e) => {
        if (template || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setDragging(false)}
      onDrop={(e) => {
        setDragging(false);
        const files = imageFiles(e.dataTransfer.files);
        if (template || !files.length) return;
        e.preventDefault();
        void addImages(files);
      }}
      // The main composer is a glass card; reply boxes stay a plain row under the post.
      className={`flex flex-col gap-2 px-4 py-3 ${parentId ? "border-b border-line" : "card mx-3 mt-3"} ${dragging ? "bg-surface outline-2 -outline-offset-4 outline-dashed outline-brand" : ""}`}
    >
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      {replyTo && <input type="hidden" name="reply_to" value={replyTo} />}
      {spoiler && <input type="hidden" name="spoiler" value="on" />}
      {rulesetId && <input type="hidden" name="ruleset_id" value={rulesetId} />}
      {quoteOf && <input type="hidden" name="quote_of" value={quoteOf} />}
      {!template && <input type="hidden" name="media" value={mediaField(images, videos)} />}
      {!template && poll && (
        <>
          <input type="hidden" name="poll_options" value={JSON.stringify(poll.options)} />
          <input type="hidden" name="poll_hours" value={poll.hours} />
        </>
      )}
      {template && (
        <>
          <input type="hidden" name="kind" value={template.kind} />
          <input type="hidden" name="event_id" value={template.entry.eventId} />
          <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm">
            <span className="truncate">
              {template.kind === "placed" ? t("feed.compose.result") : t("feed.compose.signup")}: <b>{template.entry.tournamentName}</b>
            </span>
            <button type="button" onClick={() => { setTemplate(null); setBody(""); }} className="text-muted underline">{t("feed.compose.remove")}</button>
          </div>
        </>
      )}

      <textarea
        name="body"
        value={body}
        ref={textarea}
        onChange={(e) => {
          setBody(e.target.value);
          lookForMention(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (!mention || !mention.people.length) return;
          if (e.key === "Escape") setMention(null);
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pickMention(mention.people[0].handle);
          }
        }}
        // Paste a screenshot straight into the box.
        onPaste={(e) => {
          const files = imageFiles(e.clipboardData.files);
          if (template || !files.length) return;
          e.preventDefault();
          void addImages(files);
        }}
        maxLength={POST_MAX_LENGTH}
        rows={parentId ? 2 : 3}
        placeholder={placeholder ?? t("feed.compose.placeholder")}
        aria-label={parentId ? t("feed.compose.writeReply") : t("feed.compose.writePost")}
        className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted"
      />
      {mention && mention.people.length > 0 && (
        <ul role="listbox" aria-label={t("feed.compose.mentions")} className="-mt-1 flex flex-col rounded-xl border border-line bg-background p-1 text-sm shadow">
          {mention.people.map((p) => (
            <li key={p.handle}>
              <button type="button" onClick={() => pickMention(p.handle)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface">
                <Avatar name={p.tag} src={p.avatarUrl} size="sm" className="h-6 w-6" />
                <span className="truncate font-semibold">{p.tag}</span>
                <span className="truncate text-muted">@{p.handle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!template && <DraftImages images={images} setImages={setImages} />}
      {!template && <DraftVideosView videos={videos} setVideos={setVideos} />}
      {!template && poll && (
        <fieldset className="flex flex-col gap-1.5 rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-semibold">{t("feed.poll.legend")}</legend>
          {poll.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                maxLength={POLL_MAX_OPTION}
                onChange={(e) => setPoll({ ...poll, options: poll.options.map((o, j) => (j === i ? e.target.value : o)) })}
                placeholder={t(i >= 2 ? "feed.poll.choiceOptional" : "feed.poll.choice", { n: i + 1 })}
                aria-label={t("feed.poll.choice", { n: i + 1 })}
                className="field flex-1 py-1.5"
              />
              {i >= 2 && (
                <button type="button" onClick={() => setPoll({ ...poll, options: poll.options.filter((_, j) => j !== i) })} className="btn btn-sm btn-ghost" aria-label={t("feed.poll.removeChoice", { n: i + 1 })}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            {poll.options.length < 4 && (
              <button type="button" onClick={() => setPoll({ ...poll, options: [...poll.options, ""] })} className="btn btn-sm btn-ghost">{t("feed.poll.addChoice")}</button>
            )}
            <label className="ml-auto flex items-center gap-1 text-sm text-muted">
              {t("feed.poll.openFor")}
              <select value={poll.hours} onChange={(e) => setPoll({ ...poll, hours: Number(e.target.value) })} className="rounded-full border border-line bg-field px-2 py-1 text-sm text-foreground">
                {POLL_LENGTHS.map((h) => <option key={h} value={h}>{t(POLL_LENGTH_KEYS[h])}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setPoll(null)} className="btn btn-sm btn-ghost text-danger">{t("feed.poll.remove")}</button>
          </div>
        </fieldset>
      )}

      {picker && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-line">
          {options.length === 0 ? (
            <p className="p-3 text-sm text-muted">
              {picker === "placed" ? t("feed.compose.noResults") : t("feed.compose.noSignups")}
            </p>
          ) : (
            options.map((entry) => (
              <button
                key={entry.eventId}
                type="button"
                onClick={() => choose({ kind: picker, entry })}
                className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left text-sm last:border-0 hover:bg-surface"
              >
                <span className="w-10 shrink-0 font-bold">{picker === "placed" ? ordinalFor(lang, entry.placement!) : <Icon name="calendar" />}</span>
                <span className="min-w-0 flex-1 truncate">{entry.tournamentName}</span>
                <span className="shrink-0 text-xs text-muted">{formatEventDate(entry.startAt, entry.timezone, lang)}</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!template && <AddPhotoButton full={mediaCount >= MAX_IMAGES} onFiles={addImages} />}
        {!template && <AddVideoButton setVideos={setVideos} full={videos.length >= MAX_POST_VIDEOS || mediaCount >= MAX_IMAGES} />}
        {!template && canPoll && !poll && (
          <button type="button" onClick={() => setPoll({ options: ["", ""], hours: 24 })} className="btn btn-sm btn-ghost" aria-label={t("feed.compose.addPoll")} title={t("feed.compose.addPoll")}>
            <Icon name="chart" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setSpoiler(!spoiler)}
          aria-pressed={spoiler}
          title={t("feed.compose.spoilerTitle")}
          aria-label={t("feed.compose.spoilerLabel")}
          className={`btn btn-sm ${spoiler ? "btn-outline border-brand text-brand" : "btn-ghost"}`}
        >
          <Icon name="eyeOff" /><span className="hidden sm:inline">{` ${t("feed.compose.spoiler")}${spoiler ? " ✓" : ""}`}</span>
        </button>
        {!parentId && !rulesetId && !template && (
          <>
            <select
              name="game"
              value={game}
              onChange={(e) => {
                setGame(e.target.value as FeedGame);
                setPickedGame(true);
              }}
              aria-label={t("feed.compose.game")}
              className="rounded-full border border-line bg-field px-2 py-1 text-sm"
            >
              <option value="general">{t("feed.tab.general")}</option>
              <GameOptions />
            </select>
            {game !== "general" && (
              <select
                name="character"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                aria-label={t("feed.compose.character")}
                className="max-w-36 rounded-full border border-line bg-field px-2 py-1 text-sm"
              >
                <option value="">{t("feed.compose.characterPick")}</option>
                {CHARACTERS[game].map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
              </select>
            )}
            {(results.length > 0 || signups.length > 0) && (
              <>
                <button type="button" onClick={() => setPicker(picker === "placed" ? null : "placed")} className="btn btn-sm btn-outline">
                  <Icon name="trophy" /> {t("feed.compose.shareResult")}
                </button>
                <button type="button" onClick={() => setPicker(picker === "signed_up" ? null : "signed_up")} className="btn btn-sm btn-outline">
                  <Icon name="calendar" /> {t("feed.compose.iSignedUp")}
                </button>
              </>
            )}
          </>
        )}
        <span className={`ml-auto text-xs ${remaining < 50 ? "text-brand" : "text-muted"}`}>{remaining}</span>
        <button disabled={pending || uploading || videoUploading || !body.trim() || (!!poll && poll.options.filter((o) => o.trim()).length < 2)} aria-busy={pending || uploading || videoUploading} className="btn btn-md btn-primary">
          {pending ? t("share.posting") : uploading ? t("feed.compose.addingPhotos") : videoUploading ? t("feed.compose.addingVideo") : parentId ? t("feed.compose.reply") : t("feed.compose.post")}
        </button>
      </div>
      {!parentId && !rulesetId && !template && !spoiler && firstClipLinkIn(body) && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="to_reels" checked={toReels && game !== "general"} disabled={game === "general"} onChange={(e) => setToReels(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            {t("feed.compose.toReels")}
            <span className="block text-xs text-muted">{t(game === "general" ? "feed.compose.toReelsPickGame" : "feed.compose.toReelsHint")}</span>
          </span>
        </label>
      )}
      {tagged && !parentId && !template && (
        <p className="text-xs text-muted">
          {t("feed.compose.willTag", { character: characterName(tagged.game, tagged.character) ?? tagged.character, game: GAMES[tagged.game].short })}
        </p>
      )}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
