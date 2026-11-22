import { hideInlineSpoilers } from "./spoilerText";
import { translate, type MessageKey, type Values } from "./i18n/core";
import { GAMES, type GameKey } from "./games";
import { characterName } from "./characters";

type Tr = (key: MessageKey, values?: Values) => string;
const english: Tr = (key, values) => translate("en", key, values);

/**
 * Alert sentences the database writes in English (the ladder's), in the reader's language. Anything
 * else (a sentence already written in the recipient's language, an event's name) is shown as it is.
 */
const STORED: Record<string, MessageKey> = {
  "Your ladder match is ready": "alert.ladder.ready",
  "Confirm your ladder score": "alert.ladder.confirm",
  "Your opponent says that score is wrong": "alert.ladder.disputed",
  "Your ladder match was called off": "alert.ladder.cancelled",
};
export const localAlert = (text: string, t: Tr = english): string => (STORED[text] ? t(STORED[text]) : text);
// What a push notification says and opens. Pure (shared with tests). Kept short: phones cut long text.

/** A game key stored with a play alert, as its short name ("Melee"). */
const gameShort = (key: string | null) => (key && key in GAMES ? GAMES[key as GameKey].short : "smash");

/** The character a character ping named, from its link (/play?room=melee&char=fox), as its name ("Fox"). */
export function pingCharacter(game: string | null | undefined, href: string | null | undefined): string {
  const key = href?.match(/[?&]char=([a-z0-9-]+)/)?.[1];
  return (game && key && game in GAMES && characterName(game as GameKey, key)) || key || "?";
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

const clip = (s: string | null | undefined, n = 120) => {
  const t = hideInlineSpoilers(String(s ?? "")).replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export type PushNotificationInput = {
  type: string;
  actor: { tag: string; handle: string } | null;
  post: { id: string; parentId: string | null; body: string; title: string | null; spoiler: boolean } | null;
  majorName: string | null;
  majorSlug: string | null;
  conversationId: string | null;
  eventName: string | null;
  eventHref: string | null;
};

/** A notification row as a push, or null for types that don't push. `t`: the recipient's language (English by default). */
export function notificationPush(n: PushNotificationInput, t: Tr = english): PushPayload | null {
  const who = n.actor?.tag ?? t("alert.someone");
  const postUrl = n.post ? `/post/${n.post.parentId ?? n.post.id}` : "/notifications";
  // Spoiler posts don't show their text on the lock screen.
  const snippet = n.post ? (n.post.spoiler ? t("alert.spoiler") : clip(n.post.title ?? n.post.body)) : "";
  const eventName = n.eventName ? localAlert(n.eventName, t) : null;
  switch (n.type) {
    case "reply": return { title: t("alert.reply", { who }), body: snippet, url: postUrl };
    case "mention": return { title: t("alert.mention", { who }), body: snippet, url: postUrl };
    case "quote": return { title: t("alert.quote", { who }), body: snippet, url: postUrl };
    case "follow": return { title: t("alert.follow", { who }), body: "", url: n.actor ? `/u/${n.actor.handle}` : "/notifications" };
    case "follow_request": return { title: t("alert.followRequest", { who }), body: t("alert.followRequestBody"), url: n.actor ? `/u/${n.actor.handle}` : "/notifications" };
    case "follow_accepted": return { title: t("alert.followAccepted", { who }), body: "", url: n.actor ? `/u/${n.actor.handle}` : "/notifications" };
    case "message_request": return { title: t("alert.messageRequest", { who }), body: "", url: n.conversationId ? `/messages/${n.conversationId}` : "/messages?tab=requests" };
    case "major_live": return { title: t("alert.majorLive", { name: n.majorName ?? t("alert.aMajor") }), body: t("alert.tapToWatch"), url: n.majorSlug ? `/events/${n.majorSlug}#watch` : "/events", tag: `major-${n.majorSlug ?? ""}` };
    case "event_update": return { title: `📣 ${eventName ?? t("alert.eventChanged")}`, body: t("alert.tapToSeeEvent"), url: n.eventHref ?? "/notifications" };
    case "event_result": return { title: eventName ? t("alert.placed", { event: eventName }) : t("alert.placedSomewhere"), body: t("alert.tapToSeeResults"), url: n.eventHref ?? "/notifications" };
    case "ladder_match": return { title: `⚔️ ${eventName ?? t("alert.ladderMatch")}`, body: n.actor ? t("alert.vsTapToOpen", { tag: n.actor.tag }) : t("alert.tapToOpen"), url: n.eventHref ?? "/ladder" };
    case "play_ping": return { title: t("playnow.alert.ping", { who, game: gameShort(n.eventName) }), body: t("playnow.alert.pingBody"), url: n.eventHref ?? "/play", tag: `play-ping-${n.eventName ?? ""}` };
    case "play_ping_main": return { title: t("playnow.alert.pingMain", { who, character: pingCharacter(n.eventName, n.eventHref) }), body: t("playnow.alert.pingBody"), url: n.eventHref ?? "/play", tag: `play-ping-${n.eventName ?? ""}` };
    case "play_request": return { title: t("playnow.alert.request", { who, game: gameShort(n.eventName) }), body: t("playnow.alert.requestBody"), url: n.eventHref ?? "/play", tag: `play-request-${n.actor?.handle ?? ""}` };
    case "play_accepted": return { title: t("playnow.alert.accepted", { who, game: gameShort(n.eventName) }), body: t("playnow.alert.acceptedBody"), url: n.eventHref ?? "/play", tag: `play-request-${n.actor?.handle ?? ""}` };
    case "set_ready": return { title: t("alert.youreUp"), body: eventName ? t("alert.youreUpBody", { event: eventName }) : t("alert.setReady"), url: n.eventHref ?? "/notifications" };
    case "event_reminder": return { title: eventName ? t("alert.comingUp", { event: eventName }) : t("alert.comingUpSomething"), body: t("alert.goodLuck"), url: n.eventHref ?? "/events" };
    default: return null;
  }
}

/** A direct message as a push (grouped per chat, so a burst of messages shows as one). */
export function messagePush(m: { senderTag: string; body: string; hasImage: boolean; conversationId: string; groupTitle: string | null }, t: Tr = english): PushPayload {
  const text = m.body.trim() ? clip(m.body, 100) : m.hasImage ? t("alert.photo") : t("alert.newMessage");
  return {
    title: m.groupTitle ? t("alert.inGroup", { sender: m.senderTag, group: m.groupTitle }) : m.senderTag,
    body: text,
    url: `/messages/${m.conversationId}`,
    tag: `chat-${m.conversationId}`,
  };
}
