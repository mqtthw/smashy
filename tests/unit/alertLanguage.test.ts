// Alerts in the recipient's language: phone pushes, and the ladder's stored sentences.
import { describe, expect, it } from "vitest";
import { translate, type Lang, type MessageKey, type Values } from "@/lib/i18n/core";
import { localAlert, messagePush, notificationPush, type PushNotificationInput } from "@/lib/pushText";

const tr = (lang: Lang) => (key: MessageKey, values?: Values) => translate(lang, key, values);
const base: PushNotificationInput = { type: "set_ready", actor: null, post: null, majorName: null, majorSlug: null, conversationId: null, eventName: "Weekly #4: you vs Ben", eventHref: "/host/set/x" };

describe("pushes in the recipient's language", () => {
  it("keeps English as it was, and writes Spanish and Japanese", () => {
    expect(notificationPush(base)).toEqual({ title: "⚔️ You're up!", body: "Weekly #4: you vs Ben. Tap to strike stages.", url: "/host/set/x" });
    expect(notificationPush(base, tr("es"))?.title).toBe("⚔️ ¡Te toca!");
    expect(notificationPush(base, tr("ja"))?.title).toBe("⚔️ 出番です！");
    expect(notificationPush({ ...base, type: "follow", actor: { tag: "Ada", handle: "ada" } }, tr("es"))?.title).toBe("Ada te empezó a seguir");
  });

  it("translates the ladder's stored sentences and leaves other text alone", () => {
    expect(localAlert("Your ladder match is ready", tr("es"))).toBe("Tu match de ladder está listo");
    expect(localAlert("Weekly #4: you vs Ben", tr("ja"))).toBe("Weekly #4: you vs Ben");
    expect(notificationPush({ ...base, type: "ladder_match", eventName: "Confirm your ladder score", actor: { tag: "Ben", handle: "ben" } }, tr("ja"))?.title).toBe("⚔️ ラダーの結果を確認してください");
  });

  it("writes message pushes in the recipient's language", () => {
    const m = { senderTag: "Ada", body: "", hasImage: true, conversationId: "c", groupTitle: "Weekly crew" };
    expect(messagePush(m).title).toBe("Ada in Weekly crew");
    expect(messagePush(m, tr("es"))).toMatchObject({ title: "Ada en Weekly crew", body: "Envió una foto" });
  });
});
