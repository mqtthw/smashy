"use client";

import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendChat } from "@/app/play/actions";
import { CHAT_MAX_LENGTH, chatContactInfoReason, type ChatRoom as Room } from "@/lib/guardrails";
import type { ChatMessage } from "@/lib/play";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import LiveReportButton from "./LiveReportButton";
import PlayerName from "./PlayerName";
import PingToggle from "./PingToggle";
import { isPlayGame } from "@/lib/playGames";
import { useT } from "@/lib/i18n/client";
import { chatBodyParts, tagOfKey, tagSuggestions } from "@/lib/characterTags";
import { CHARACTERS } from "@/lib/characters";
import CharacterIcon from "@/components/CharacterIcon";

const time = (iso: string, timeZone: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));

/** Live chat for one room. New messages arrive instantly via Supabase Realtime. */
export default function ChatRoom({ room, initial, viewerId, pingOn = false }: { room: Room; initial: ChatMessage[]; viewerId: string; pingOn?: boolean }) {
  const game = isPlayGame(room) ? room : null;
  const [note, setNote] = useState<string | null>(null);
  const [messages, setMessages] = useState(initial);
  const t = useT();
  const tz = useViewerTimeZone(); // times in the reader's own time zone and style
  const locale = useViewerLocale();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // An "@word" being typed at the end of the message: suggest @matchmaking and this game's characters.
  const typingTag = game ? text.match(/(?:^|\s)@([A-Za-z0-9]*)$/)?.[1] : undefined;
  const suggestions = typingTag !== undefined ? tagSuggestions(game, typingTag) : [];
  const pickTag = (tag: string) => {
    setText((cur) => cur.replace(/@[A-Za-z0-9]*$/, `@${tag} `));
    inputRef.current?.focus();
  };
  const stickToBottom = useRef(true);

  const add = (m: ChatMessage) =>
    setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m].slice(-200)));

  // Listen for new messages in this room.
  useEffect(
    () =>
      subscribeAsUser((supabase) =>
        supabase
          .channel(`chat-${room}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room=eq.${room}` }, (payload) => {
            const m = payload.new as { id: string; room: Room; author_id: string; author_tag: string; body: string; created_at: string };
            add({ id: m.id, room: m.room, authorId: m.author_id, authorTag: m.author_tag, body: m.body, createdAt: m.created_at });
          }),
      ),
    [room],
  );

  // Keep scrolled to the newest message unless the reader scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    const blocked = chatContactInfoReason(text);
    if (blocked) return setError(blocked);
    startTransition(async () => {
      const res = await sendChat(room, text);
      if (res.error) return setError(res.error);
      setError(null);
      setNote(
        res.ping === "sent"
          ? res.pingChars?.length ? t("playnow.ping.sentMain", { chars: res.pingChars.join(", ") }) : t("playnow.ping.sent")
          : res.ping === "cooldown" ? t("playnow.ping.cooldown") : null,
      );
      setText("");
      stickToBottom.current = true;
      if (res.message) add(res.message);
    });
  };

  return (
    <div className="flex flex-col">
      {game && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2 text-xs text-muted">
          <PingToggle game={game} on={pingOn} />
          <span className="min-w-0 flex-1">{t("playnow.ping.hint")}</span>
        </div>
      )}
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex h-[28vh] max-h-[20rem] min-h-40 flex-col gap-1 overflow-y-auto px-4 py-3"
        aria-live="polite"
        aria-label={t("play.chat.messages")}
      >
        {messages.length === 0 && <p className="m-auto text-sm text-muted">{t("play.chat.quiet")}</p>}
        {messages.map((m) => (
          <div key={m.id} className="group flex items-baseline gap-2 text-sm">
            <span className="shrink-0 text-xs text-muted">{time(m.createdAt, tz, locale)}</span>
            <p className="min-w-0 flex-1 break-words">
              <PlayerName id={m.authorId} tag={m.authorTag} game={game} mine={m.authorId === viewerId} />{" "}
              {chatBodyParts(game, m.body).map((part, i) =>
                "text" in part ? (
                  <span key={i}>{part.text}</span>
                ) : (
                  // A character tag: the character's stock icon and name, read aloud as the tag that was typed.
                  <span key={i} className="inline-flex items-baseline gap-0.5 font-semibold text-brand" title={part.tag}>
                    {game && <span className="self-center"><CharacterIcon game={game} character={part.character} size={16} /></span>}
                    {part.name}
                  </span>
                ),
              )}
            </p>
            {m.authorId !== viewerId && (
              <span className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                <LiveReportButton kind="chat" targetId={m.id} />
              </span>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex flex-col gap-1 border-t border-line px-4 py-3"
      >
        {suggestions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label={t("playnow.ping.suggest")}>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => pickTag(s)} className="chip flex shrink-0 items-center gap-1 text-xs">
                {game && s !== "matchmaking" && (() => {
                  const c = CHARACTERS[game].find((x) => tagOfKey(x.key) === s.toLowerCase());
                  return c ? <CharacterIcon game={game} character={c.key} size={14} /> : null;
                })()}
                @{s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            maxLength={CHAT_MAX_LENGTH}
            placeholder={t("play.chat.placeholder")}
            aria-label={t("play.chat.label")}
            className="min-w-0 flex-1 rounded-full border border-line bg-field px-4 py-2 text-sm"
          />
          <button disabled={pending || !text.trim()} className="btn btn-md btn-primary">
            {t("play.chat.send")}
          </button>
        </div>
        <p className="text-xs text-muted">
          {error ? <span className="text-danger">{error}</span> : note ?? t("play.chat.note")}
        </p>
      </form>
    </div>
  );
}
