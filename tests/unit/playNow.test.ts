// "I want to play now" (round 398): the @matchmaking rule and what the phone alerts say.
import { describe, expect, it } from "vitest";
import { translate, type Lang, type MessageKey, type Values } from "@/lib/i18n/core";
import { isPlayGame, tagsMatchmaking } from "@/lib/playGames";
import { notificationPush, type PushNotificationInput } from "@/lib/pushText";

const tr = (lang: Lang) => (key: MessageKey, values?: Values) => translate(lang, key, values);
const base: PushNotificationInput = { type: "play_request", actor: { tag: "Ada", handle: "ada" }, post: null, majorName: null, majorSlug: null, conversationId: null, eventName: "melee", eventHref: "/play?room=melee#requests" };

describe("@matchmaking", () => {
  it("counts the tag on its own, in any case, anywhere in the message", () => {
    expect(tagsMatchmaking("@matchmaking anyone?")).toBe(true);
    expect(tagsMatchmaking("anyone up? @MatchMaking")).toBe(true);
    expect(tagsMatchmaking("games (@matchmaking)")).toBe(true);
  });
  it("doesn't count longer words or emails", () => {
    expect(tagsMatchmaking("@matchmakingbot")).toBe(false);
    expect(tagsMatchmaking("me@matchmaking")).toBe(false);
    expect(tagsMatchmaking("matchmaking")).toBe(false);
  });
});

describe("play games", () => {
  it("are the games with a Play room", () => {
    expect(isPlayGame("melee")).toBe(true);
    expect(isPlayGame("general")).toBe(false);
    expect(isPlayGame(undefined)).toBe(false);
  });
});

describe("play alerts", () => {
  it("name the person and the game, and open the Play tab", () => {
    expect(notificationPush(base)).toEqual({ title: "Ada wants to play Melee now", body: "Tap to answer. It ends in 15 minutes.", url: "/play?room=melee#requests", tag: "play-request-ada" });
    expect(notificationPush({ ...base, type: "play_accepted" })?.title).toBe("Ada is ready to play Melee");
    expect(notificationPush({ ...base, type: "play_ping", eventHref: "/play?room=melee" })?.url).toBe("/play?room=melee");
  });
  it("are in the reader's language", () => {
    expect(notificationPush(base, tr("es"))?.title).toBe("Ada quiere jugar Melee ahora");
    expect(notificationPush(base, tr("fr"))?.title).toBe("Ada veut jouer à Melee maintenant");
    expect(notificationPush(base, tr("ja"))?.title).toBe("Adaさんが今すぐMeleeで対戦したがっています");
  });
});

describe("chat contact-info rule", () => {
  it("lets the @matchmaking tag through and still refuses other handles", async () => {
    const { chatContactInfoReason } = await import("@/lib/guardrails");
    expect(chatContactInfoReason("@matchmaking anyone?")).toBeNull();
    expect(chatContactInfoReason("@MATCHMAKING")).toBeNull();
    expect(chatContactInfoReason("@matchmaking_bob")).not.toBeNull();
    expect(chatContactInfoReason("add @someone")).not.toBeNull();
    expect(chatContactInfoReason("@matchmaking.com")).not.toBeNull();
  });
});
