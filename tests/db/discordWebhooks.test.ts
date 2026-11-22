// Discord webhooks for an event: the link is a key to a channel, so no member can read or write
// the table, and only Discord's own addresses fit in it.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const HOOK = "https://discord.com/api/webhooks/123456789012345678/abcDEF_123-abcDEF_123-abcDEF_123";

describe.skipIf(!hasDb)("discord webhooks", () => {
  afterAll(cleanup);

  it("keeps the link closed to everyone but the server, and takes only Discord webhook addresses", async () => {
    const [host, other] = await Promise.all([makeUser("DwHost"), makeUser("DwOther")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Webhook test", game: "melee", starts_at: inHours(48) }).select("id").single();

    // The server saves it (this is what the site does after checking the host).
    expect((await admin.from("hosted_webhooks").insert({ event_id: ev!.id, url: HOOK, created_by: host.id })).error).toBeNull();

    // Nobody reads it or writes it through the API: not the host, a stranger, or a signed-out visitor.
    for (const who of [host.c, other.c, guest()]) {
      expect((await who.from("hosted_webhooks").select("url").eq("event_id", ev!.id)).data ?? []).toEqual([]);
      expect((await who.from("hosted_webhooks").update({ calls: false }).eq("event_id", ev!.id).select("event_id")).data ?? []).toEqual([]);
      expect((await who.from("hosted_webhooks").delete().eq("event_id", ev!.id).select("event_id")).data ?? []).toEqual([]);
    }
    expect((await admin.from("hosted_webhooks").select("url, calls").eq("event_id", ev!.id).single()).data).toEqual({ url: HOOK, calls: true });

    // Only Discord's webhook addresses fit, even for the server.
    const { data: ev2 } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Webhook test 2", game: "melee", starts_at: inHours(48) }).select("id").single();
    for (const bad of ["https://evil.example/api/webhooks/123456789012345678/abcDEF_123-abcDEF_123-abcDEF_123", HOOK.replace("https://", "http://"), "https://discord.com/channels/1/2", HOOK + "/../x"]) {
      expect((await admin.from("hosted_webhooks").insert({ event_id: ev2!.id, url: bad })).error, bad).not.toBeNull();
    }
  });
});
