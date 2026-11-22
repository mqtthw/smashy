"use client";

import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import LiveReportButton from "@/components/play/LiveReportButton";
import type { ChatMessage, Person } from "@/lib/messages";
import { shrinkImage } from "@/lib/shrinkImage";
import { createClient } from "@/lib/supabase/client";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import { loadMessage, loadNewerMessages, loadOlderMessages, markRead, reactToMessage, sendMessage, unsendMessage } from "../actions";
import { MESSAGE_REACTIONS } from "@/lib/messageReactions";
import Avatar from "@/components/ui/Avatar";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";
import { OFFICIAL_HANDLE } from "@/lib/officialHost";
import { linkParts } from "@/lib/linkParts";

const MAX = 1000;
// In the reader's own time zone.
const time = (iso: string, timeZone: string, locale = "en-US") => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
const day = (iso: string, timeZone: string, locale = "en-US") => new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", timeZone }).format(new Date(iso));

/** The messages of one chat, live, with a box to write (text and/or one photo). */
export default function ChatView({
  conversationId,
  viewerId,
  initial,
  people,
  isGroup,
  canSend: canSendAtFirst,
  cantSendReason,
  waitingOnThem = false,
  isRequest = false,
  blockedIds = [],
  otherReadAt: otherReadAtFirst = null,
  hasOlder: hasOlderFirst = false,
  myLastReadAt = null,
}: {
  conversationId: string;
  viewerId: string;
  initial: ChatMessage[];
  people: Person[]; // everyone else (for names in groups)
  isGroup: boolean;
  canSend: boolean;
  cantSendReason: string | null;
  waitingOnThem?: boolean; // a request they haven't accepted: one message, then wait
  isRequest?: boolean; // a request to you that you haven't accepted: reading it stays private
  blockedIds?: string[]; // in groups: people you blocked (their messages are hidden from you)
  otherReadAt?: string | null; // direct chats: when they last read it (for "Seen")
  hasOlder?: boolean;
  myLastReadAt?: string | null; // when you last read it, before opening now
}) {
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const t = useT();
  const tz = useViewerTimeZone();
  const locale = useViewerLocale();
  const composer = useRef<HTMLTextAreaElement>(null);
  const [picker, setPicker] = useState<string | null>(null); // message showing the reaction picker
  // The "New messages" line goes above the first unread message from someone else (fixed on open).
  const [firstUnreadId] = useState(() =>
    myLastReadAt ? initial.find((m) => m.senderId !== viewerId && Date.parse(m.createdAt) > Date.parse(myLastReadAt))?.id ?? null : null,
  );
  // Smashy's own account (@smashyhq): its links are clickable (the welcome message's Discord invite, round 705).
  const isOfficial = (id: string | null) => !!id && people.find((p) => p.id === id)?.handle === OFFICIAL_HANDLE;
  const avatarOf = (id: string | null) => people.find((p) => p.id === id)?.avatarUrl ?? null;
  const [otherReadAt, setOtherReadAt] = useState(otherReadAtFirst);
  const [hasOlder, setHasOlder] = useState(hasOlderFirst);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState<Record<string, number>>({}); // who's typing -> until when
  const signals = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const [canSend, setCanSend] = useState(canSendAtFirst);
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ file: Blob; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const blocked = new Set(blockedIds);
  // Photo links expire after an hour: if one fails to load, get a fresh link (once per message).
  const refetched = useRef(new Set<string>());
  const refreshPhoto = (id: string) => {
    if (refetched.current.has(id)) return;
    refetched.current.add(id);
    void loadMessage(id).then((m) => m && upsert(m));
  };
  const nameOf = (id: string | null) => (id === viewerId ? t("play.msg.youName") : people.find((p) => p.id === id)?.tag ?? t("play.msg.formerMember"));

  const upsert = useCallback(
    (m: ChatMessage) => setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur.map((x) => (x.id === m.id ? m : x)) : [...cur, m])),
    [],
  );

  const read = useCallback(() => {
    // Looking at a message request doesn't mark it read or tell the sender ("They won't know you've seen this").
    if (isRequest) return;
    void markRead(conversationId).then(() => {
      window.dispatchEvent(new Event("smashy:messages-read"));
      // Tell the others in the chat (for "Seen"). Signals carry no message content.
      void signals.current?.send({ type: "broadcast", event: "signal", payload: { kind: "read", userId: viewerId, at: new Date().toISOString() } });
    });
  }, [conversationId, viewerId, isRequest]);

  // Typing and "seen" signals: a live channel just for this chat, never stored.
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let stopped = false;
    void (async () => {
      const { data } = await supabase.auth.getSession(); // private channels need the login first
      if (stopped) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (stopped) return; // left the chat while signing the channel in (round 624)
      channel = supabase
      .channel(`chat-signals:${conversationId}`, { config: { broadcast: { self: false }, private: true } }) // only chat members (database rule)
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        const p = payload as { kind: string; userId: string; at?: string; messageId?: string };
        if (p.userId === viewerId) return;
        if (p.kind === "typing") setTyping((cur) => ({ ...cur, [p.userId]: Date.now() + 4000 }));
        if (p.kind === "read" && p.at) setOtherReadAt(p.at);
        if (p.kind === "sent") setTyping((cur) => ({ ...cur, [p.userId]: 0 }));
        // Someone reacted (or took a reaction back): re-read that message for fresh counts.
        if (p.kind === "reaction" && typeof p.messageId === "string") {
          const id = p.messageId;
          void loadMessage(id).then((m) => {
            if (m) setMessages((cur) => (cur.some((x) => x.id === id) ? cur.map((x) => (x.id === id ? m : x)) : cur));
          });
        }
      })
      .subscribe();
      signals.current = channel;
    })();
    const tick = setInterval(() => setTyping((cur) => (Object.values(cur).some((t) => t && t < Date.now()) ? Object.fromEntries(Object.entries(cur).filter(([, t]) => t > Date.now())) : cur)), 1500);
    return () => {
      clearInterval(tick);
      stopped = true;
      signals.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, viewerId]);

  const lastMineId = isGroup ? null : [...messages].reverse().find((m) => m.senderId === viewerId && !m.deleted)?.id ?? null;
  const typingNow = Object.entries(typing).filter(([, until]) => until > 0).map(([id]) => nameOf(id)); // expired ones are dropped by the tick
  const sayTyping = () => {
    if (Date.now() - lastTypingSent.current < 2500) return;
    lastTypingSent.current = Date.now();
    void signals.current?.send({ type: "broadcast", event: "signal", payload: { kind: "typing", userId: viewerId } });
  };

  const loadOlder = async () => {
    const first = messages[0];
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    stick.current = false;
    const el = list.current;
    const fromBottom = el ? el.scrollHeight - el.scrollTop : 0;
    try {
      const res = await loadOlderMessages(conversationId, first.createdAt);
      setMessages((cur) => [...res.messages.filter((m) => !cur.some((c) => c.id === m.id)), ...cur]);
      setHasOlder(res.hasOlder);
    } catch {
      setError(t("play.msg.loadError"));
    } finally {
      setLoadingOlder(false); // never stuck on "Loading..." (round 624)
    }
    // Keep the same message in view after adding older ones above it.
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - fromBottom;
    });
  };

  // Opening the chat marks it read; new messages arrive live (and are marked read while you're here).
  useEffect(() => {
    read();
    return subscribeAsUser((client) =>
      client
        .channel(`conversation-${conversationId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
          const row = payload.new as { id: string; sender_id: string | null; body: string; image_path: string | null; created_at: string };
          // Photos are private: fetch the message again to get a link. Text shows right away.
          if (row.image_path) {
            const m = await loadMessage(row.id);
            if (m) upsert(m);
          } else {
            const r2 = row as typeof row & { reply_to_id?: string | null };
            if (r2.reply_to_id) {
              const m = await loadMessage(row.id); // to show what it replies to
              if (m) upsert(m);
            } else {
              upsert({ id: row.id, senderId: row.sender_id, body: row.body, image: null, deleted: false, createdAt: row.created_at, replyTo: null, reactions: [] });
            }
          }
          if (row.sender_id !== viewerId && document.visibilityState === "visible") read();
        })
        // Reactions arrive over the chat's private signal channel (above), not the database's live
        // feed: that feed can't keep "reaction removed" events to the chat's members.
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          const row = payload.new as { id: string; deleted_at: string | null };
          if (row.deleted_at) setMessages((cur) => cur.map((x) => (x.id === row.id ? { ...x, body: "", image: null, deleted: true } : x)));
        }),
    );
  }, [conversationId, viewerId, upsert, read]);

  // Catch up on messages sent while the chat wasn't live: on open (the screen may be a kept copy) and
  // when the app or tab comes back to the front, or the connection returns (round 624).
  const newest = useRef<string | null>(null);
  useEffect(() => {
    newest.current = messages.at(-1)?.createdAt ?? null;
  }, [messages]);
  useEffect(() => {
    let busy = false;
    const catchUp = async () => {
      if (busy || document.visibilityState !== "visible" || !newest.current) return;
      busy = true;
      try {
        const fresh = await loadNewerMessages(conversationId, newest.current);
        fresh.forEach(upsert);
        if (fresh.some((m) => m.senderId !== viewerId)) read();
      } catch {
        // offline: the next return to the front tries again
      } finally {
        busy = false;
      }
    };
    void catchUp();
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("online", catchUp);
    return () => {
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("online", catchUp);
    };
  }, [conversationId, viewerId, upsert, read]);

  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // The message box grows with what you type (up to about 6 lines).
  useEffect(() => {
    const ta = composer.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const small = await shrinkImage(file);
      setPhoto({ file: small, preview: URL.createObjectURL(small) });
      setError(null);
    } catch {
      setError(t("play.msg.photoError"));
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const react = (m: ChatMessage, emoji: string) => {
    const had = m.reactions.find((r) => r.emoji === emoji)?.mine ?? false;
    const before = m.reactions; // put back if saving fails (round 624)
    const undo = () => setMessages((cur) => cur.map((x) => (x.id === m.id ? { ...x, reactions: before } : x)));
    setMessages((cur) =>
      cur.map((x) => {
        if (x.id !== m.id) return x;
        const list = x.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + (had ? -1 : 1), mine: !had } : r));
        if (!had && !list.some((r) => r.emoji === emoji)) list.push({ emoji, count: 1, mine: true });
        return { ...x, reactions: list.filter((r) => r.count > 0) };
      }),
    );
    setPicker(null);
    void reactToMessage(m.id, emoji, !had).then((res) => {
      if (res.error) {
        undo();
        return setError(res.error);
      }
      // Tell the others in the chat to refresh this message's reactions (no content is sent).
      void signals.current?.send({ type: "broadcast", event: "signal", payload: { kind: "reaction", userId: viewerId, messageId: m.id } });
    }, () => {
      undo();
      setError(t("play.msg.loadError"));
    });
  };

  const send = () =>
    startTransition(async () => {
      // What's being sent: anything typed or picked while it sends stays in the box (round 624).
      const sentText = text, sentPhoto = photo, sentReply = replyTo;
      const fd = new FormData();
      fd.append("body", sentText);
      if (sentReply) fd.append("reply_to", sentReply.id);
      if (sentPhoto) fd.append("photo", new File([sentPhoto.file], "photo.jpg", { type: "image/jpeg" }));
      const res = await sendMessage(conversationId, fd);
      if (res.error) return setError(res.error);
      setError(null);
      setText((cur) => (cur === sentText ? "" : cur));
      if (sentPhoto) URL.revokeObjectURL(sentPhoto.preview);
      setPhoto((cur) => (cur === sentPhoto ? null : cur));
      setReplyTo((cur) => (cur === sentReply ? null : cur));
      stick.current = true;
      if (res.message) upsert(res.message);
      void signals.current?.send({ type: "broadcast", event: "signal", payload: { kind: "sent", userId: viewerId } });
      if (waitingOnThem) setCanSend(false); // that was the one message a request allows
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-3"
        aria-live="polite"
      >
        {hasOlder && (
          <button type="button" onClick={loadOlder} disabled={loadingOlder} className="btn btn-sm btn-ghost self-center">
            {loadingOlder ? t("play.msg.loading") : t("play.msg.loadEarlier")}
          </button>
        )}
        {messages.length === 0 && <p className="m-auto text-sm text-muted">{t("play.msg.sayHi")}</p>}
        {messages.map((m, i) => {
          const mine = m.senderId === viewerId;
          const prev = messages[i - 1];
          const newDay = !prev || day(prev.createdAt, tz) !== day(m.createdAt, tz);
          const showName = isGroup && !mine && (newDay || prev?.senderId !== m.senderId);
          return (
            <div key={m.id} className="flex flex-col">
              {newDay && <p className="my-2 text-center text-meta text-muted">{day(m.createdAt, tz, locale)}</p>}
              {m.id === firstUnreadId && (
                <p className="my-2 flex items-center gap-2 text-meta font-semibold text-brand" role="separator">
                  <span className="h-px flex-1 bg-brand/40" /> {t("play.msg.newMessages")} <span className="h-px flex-1 bg-brand/40" />
                </p>
              )}
              {showName && <p className="ml-9 mt-1 text-meta font-semibold text-muted">{nameOf(m.senderId)}</p>}
              <div className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                {isGroup && !mine && (
                  <span className="w-7 shrink-0">{showName && <Avatar name={nameOf(m.senderId)} src={avatarOf(m.senderId)} size="sm" className="h-7 w-7" />}</span>
                )}
                <div
                  className={`max-w-[80%] overflow-hidden rounded-2xl text-sm ${
                    m.deleted ? "border border-line px-3 py-2 italic text-muted" : mine ? "bg-brand text-on-brand" : "bg-surface"
                  }`}
                >
                  {m.deleted ? (
                    t("play.msg.unsent")
                  ) : !mine && m.senderId && blocked.has(m.senderId) ? (
                    <span className="block px-3 py-2 italic text-muted">{t("play.msg.hiddenBlocked")}</span>
                  ) : (
                    <>
                      {m.replyTo && (
                        <span className={`block border-l-2 px-3 pt-2 text-xs ${mine ? "border-on-brand/60 text-on-brand/80" : "border-line text-muted"}`}>
                          <b>{nameOf(m.replyTo.senderId)}</b>: {m.replyTo.snippet}
                        </span>
                      )}
                      {m.image && (
                        <a href={m.image.url} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.image.url} alt={t("play.msg.photo")} width={m.image.width} height={m.image.height} onError={() => refreshPhoto(m.id)} className="max-h-80 w-auto object-cover" />
                        <NewTab /></a>
                      )}
                      {m.body && (
                        <p className="whitespace-pre-wrap break-words px-3 py-2">
                          {isOfficial(m.senderId)
                            ? linkParts(m.body).map((part, i) => part.href ? <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className="underline">{part.text}<NewTab /></a> : part.text)
                            : m.body}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {time(m.createdAt, tz, locale)}
                  {m.id === lastMineId && otherReadAt && Date.parse(otherReadAt) >= Date.parse(m.createdAt) && <span className="block text-right">{t("play.msg.seen")}</span>}
                </span>
                {/* Actions show on hover with a mouse, and always on touch screens (which have no hover). */}
                {!m.deleted && (
                  <span className="relative flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                    {canSend && (
                      <>
                        <button type="button" onClick={() => setReplyTo(m)} className="text-[11px] text-muted hover:text-foreground" aria-label={t("play.msg.replyLabel")}>
                          {t("play.msg.reply")}
                        </button>
                        <button type="button" onClick={() => setPicker(picker === m.id ? null : m.id)} className="text-[11px] text-muted hover:text-foreground" aria-label={t("play.msg.react")} aria-expanded={picker === m.id}>
                          😊+
                        </button>
                        {picker === m.id && (
                          <span className={`absolute bottom-full z-10 mb-1 flex gap-1 rounded-full border border-line bg-background px-2 py-1 shadow ${mine ? "right-0" : "left-0"}`}>
                            {MESSAGE_REACTIONS.map((e) => (
                              <button key={e} type="button" onClick={() => react(m, e)} aria-label={t("play.msg.reactWith", { emoji: e })} className="text-base hover:scale-125">
                                {e}
                              </button>
                            ))}
                          </span>
                        )}
                      </>
                    )}
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t("play.msg.unsendConfirm"))) {
                            setMessages((cur) => cur.map((x) => (x.id === m.id ? { ...x, body: "", image: null, deleted: true } : x)));
                            // Didn't go through: show the message again (round 624).
                            const restore = () => {
                              setMessages((cur) => cur.map((x) => (x.id === m.id ? m : x)));
                              setError(t("play.msg.unsendError"));
                            };
                            void unsendMessage(m.id).then((r) => !r.ok && restore(), restore);
                          }
                        }}
                        className="text-[11px] text-muted hover:text-danger"
                      >
                        {t("play.msg.unsend")}
                      </button>
                    ) : (
                      <LiveReportButton kind="message" targetId={m.id} className="text-[11px] text-muted hover:text-brand" />
                    )}
                  </span>
                )}
              </div>
              {m.reactions.length > 0 && !m.deleted && (
                <div className={`mt-0.5 flex flex-wrap gap-1 ${mine ? "justify-end" : isGroup ? "ml-9" : ""}`}>
                  {m.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => canSend && react(m, r.emoji)}
                      aria-pressed={r.mine}
                      aria-label={t(r.mine ? "play.msg.reactionCountMine" : "play.msg.reactionCount", { emoji: r.emoji, n: r.count })}
                      className={`rounded-full border px-1.5 text-xs ${r.mine ? "border-brand bg-brand/10" : "border-line bg-surface"}`}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {typingNow.length > 0 && (
        <p className="px-4 pb-1 text-meta text-muted" aria-live="polite">
          {typingNow.length === 1 ? t("play.msg.typingOne", { name: typingNow[0] }) : t("play.msg.typingMany", { n: typingNow.length })}
        </p>
      )}
      <div className="border-t border-line px-4 py-3">
        {canSend ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!pending && (text.trim() || photo)) send();
            }}
            className="flex flex-col gap-2"
          >
            {replyTo && (
              <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  {t("play.msg.replyingTo")} <b>{nameOf(replyTo.senderId)}</b>: {replyTo.body || (replyTo.image ? t("play.msg.photo") : "")}
                </span>
                <button type="button" onClick={() => setReplyTo(null)} aria-label={t("play.msg.cancelReply")} className="text-muted">✕</button>
              </div>
            )}
            {photo && (
              <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt={t("play.msg.photoToSend")} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(photo.preview);
                    setPhoto(null);
                  }}
                  aria-label={t("play.msg.removePhoto")}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
              <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-sm btn-ghost" aria-label={t("play.msg.addPhoto")} title={t("play.msg.addPhoto")}>
                <Icon name="image" />
              </button>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value.slice(0, MAX));
                  if (e.target.value) sayTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                onPaste={(e) => {
                  const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
                  if (f) {
                    e.preventDefault();
                    void pickPhoto(f);
                  }
                }}
                rows={1}
                ref={composer}
                placeholder={t("play.msg.placeholder")}
                aria-label={t("play.msg.placeholder")}
                className="field max-h-32 min-h-10 flex-1 resize-none"
              />
              <button disabled={pending || (!text.trim() && !photo)} className="btn btn-md btn-primary">
                {pending ? (photo ? t("play.msg.checking") : t("play.msg.sending")) : t("play.msg.send")}
              </button>
            </div>
            {text.length > MAX - 200 && <p className={`text-right text-meta ${text.length >= MAX ? "text-danger" : "text-muted"}`}>{text.length} / {MAX}</p>}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </form>
        ) : (
          <p className="text-center text-sm text-muted">
            {waitingOnThem ? t("play.msg.requestSent") : cantSendReason ?? t("play.msg.cantSend")}{" "}
            <Link href="/messages" className="link">{t("play.msg.back")}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
