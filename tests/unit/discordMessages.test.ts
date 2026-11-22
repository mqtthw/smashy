// Discord for an event: which links are accepted, what the messages say, and how one is sent.
import { describe, expect, it } from "vitest";
import { callsMessage, connectedMessage, plain, postDiscord, readWebhook, resultsMessage, signupMessage, startedMessage } from "@/lib/discordMessages";

const HOOK = "https://discord.com/api/webhooks/123456789012345678/abcDEF_123-abcDEF_123-abcDEF_123";

describe("a webhook link", () => {
  it("is accepted from Discord's own addresses, tidied", () => {
    expect(readWebhook(HOOK)).toBe(HOOK);
    expect(readWebhook(`  ${HOOK}/?wait=true `)).toBe(HOOK);
    expect(readWebhook(HOOK.replace("discord.com", "discordapp.com"))).toBe(HOOK.replace("discord.com", "discordapp.com"));
    expect(readWebhook(HOOK.replace("discord.com", "canary.discord.com"))).toBe(HOOK);
  });

  it("is refused from anywhere else, or in any other shape", () => {
    for (const bad of [
      "",
      "not a link",
      HOOK.replace("https://", "http://"),
      HOOK.replace("discord.com", "discord.com.evil.example"),
      HOOK.replace("discord.com", "evil.example"),
      "https://discord.com/api/webhooks/123456789012345678", // no token
      "https://discord.com/channels/1/2",
      "https://discord.com/api/webhooks/123456789012345678/abc/../../users/@me",
      "https://localhost/api/webhooks/123456789012345678/abcDEF_123-abcDEF_123-abcDEF_123",
    ]) {
      expect(readWebhook(bad), bad).toBeNull();
    }
  });
});

describe("the messages", () => {
  it("show names as typed, never as formatting or a mention", () => {
    expect(plain("*Fox* _main_")).toBe("\\*Fox\\* \\_main\\_");
    expect(plain("@everyone")).toBe("@​everyone");
    expect(plain("[link](http://x)")).toBe("\\[link\\](http://x)"); // no longer a named link
    expect(plain("Weekly #3")).toBe("Weekly #3");
  });

  it("say the channel is connected, and announce sign-ups and the start", () => {
    expect(connectedMessage("Weekly #3", "https://smashy.gg/host/1")).toContain("**Weekly #3** will post here");
    expect(signupMessage({ name: "Weekly #3", when: "Fri, Nov 20, 7:00 PM CST", where: "Game Over, San Antonio", entries: 12, cap: 32, teams: false }, "https://smashy.gg/host/1")).toBe(
      "📣 **Weekly #3**\nFri, Nov 20, 7:00 PM CST · Game Over, San Antonio\n12 / 32 players so far. Sign up: <https://smashy.gg/host/1>",
    );
    expect(startedMessage("Weekly #3", 8, true, "https://smashy.gg/host/1/bracket")).toBe("🎮 **Weekly #3** has started with 8 teams. Live bracket: <https://smashy.gg/host/1/bracket>");
  });

  it("call sets with where to play", () => {
    const text = callsMessage(
      "Weekly #3",
      [
        { identifier: "C", a: "Ben", b: "Gus", station: "Setup 1" },
        { identifier: "D", a: "Cy", b: "Fay", station: null },
      ],
      "https://smashy.gg/host/1/bracket",
    );
    expect(text).toBe("🔔 Weekly #3: sets called\n**Set C**: Ben vs Gus → **Setup 1**\n**Set D**: Cy vs Fay\n<https://smashy.gg/host/1/bracket>");
    expect(callsMessage("Weekly #3", [{ identifier: "C", a: "Ben", b: "Gus", station: "Setup 1" }], "u")).toContain("you're up");
  });

  it("stay under Discord's length limit however many sets are called", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ identifier: `A${i}`, a: "Player One With A Long Tag", b: "Player Two With A Long Tag", station: "Setup 12" }));
    const text = callsMessage("A big pool event", many, "https://smashy.gg/host/1/bracket");
    expect(text.length).toBeLessThanOrEqual(2000);
    expect(text.endsWith("<https://smashy.gg/host/1/bracket>")).toBe(true);
    expect(text).toContain("…");
  });

  it("post the top 8 with ties on one line, leaving out players who can't be named", () => {
    const places = [
      { id: "a", place: 1 },
      { id: "b", place: 2 },
      { id: "c", place: 3 },
      { id: "d", place: 3 },
      { id: "hidden", place: 5 },
      { id: "e", place: 9 },
    ];
    const tags: Record<string, string> = { a: "Ada", b: "Ben", c: "Cy", d: "Dee", e: "Eli" };
    expect(resultsMessage("Weekly #3", places, (id) => tags[id] ?? null, "https://smashy.gg/host/1")).toBe("🏆 **Weekly #3**: results\n🥇 Ada\n🥈 Ben\n🥉 Cy, Dee\nFull bracket: <https://smashy.gg/host/1>");
  });
});

describe("sending", () => {
  const reply = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;

  it("posts as Smashy with mentions switched off", async () => {
    let sent: { url: string; body: { content: string; username: string; allowed_mentions: { parse: string[] } } } | null = null;
    const fetcher = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)) };
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    expect(await postDiscord(HOOK, "hello", fetcher)).toEqual({ ok: true });
    expect(sent).toEqual({ url: HOOK, body: { content: "hello", username: "Smashy", allowed_mentions: { parse: [] } } });
  });

  it("shows the results graphic under the message when one is given", async () => {
    let body: { embeds?: { image: { url: string } }[] } | null = null;
    const fetcher = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    await postDiscord(HOOK, "results", fetcher, "https://smashy.gg/host/1/top8.png");
    expect(body!.embeds).toEqual([{ image: { url: "https://smashy.gg/host/1/top8.png" } }]);
    await postDiscord(HOOK, "results", fetcher);
    expect(body!.embeds).toBeUndefined();
  });

  it("says when the webhook is gone, and never throws", async () => {
    expect(await postDiscord(HOOK, "x", reply(404))).toEqual({ ok: false, gone: true });
    expect(await postDiscord(HOOK, "x", reply(429))).toEqual({ ok: false, gone: false });
    expect(await postDiscord(HOOK, "x", (async () => { throw new Error("network down"); }) as unknown as typeof fetch)).toEqual({ ok: false, gone: false });
  });

  it("never requests an address that isn't a Discord webhook", async () => {
    let called = false;
    const fetcher = (async () => { called = true; return new Response(null, { status: 204 }); }) as unknown as typeof fetch;
    expect(await postDiscord("https://evil.example/api/webhooks/1/abc", "x", fetcher)).toEqual({ ok: false, gone: true });
    expect(called).toBe(false);
  });
});
