// Sending to iPhones (lib/applePush.ts), against a local stand-in for Apple's push service and a
// throwaway key made for the test. No real key, phone or network is involved.
import { createVerify, generateKeyPairSync } from "node:crypto";
import { createServer, type Http2Server, type IncomingHttpHeaders, type ServerHttp2Session } from "node:http2";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { appleBody, appleToken, readAppleKey, sendApple, type AppleKey } from "@/lib/applePush";

const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = pair.privateKey.export({ type: "pkcs8", format: "pem" }) as string;
const key: AppleKey = { teamId: "TEAM123456", keyId: "KEY1234567", privateKey: pem };
const payload = { title: "Mango", body: "Replied to your post", url: "/post/1", tag: "post-1" };
const DEVICE = "AB".repeat(32); // the app's push plugin gives the token in capital letters

type Seen = { path: string; headers: IncomingHttpHeaders; body: string };
type Reply = { status: number; reason?: string };

/** A stand-in for one of Apple's two addresses: answers from `replies` in order, then 200. */
function fakeApple() {
  const seen: Seen[] = [];
  const replies: Reply[] = [];
  const server: Http2Server = createServer();
  // The code under test keeps its connection open for reuse (as with the real Apple), and server.close()
  // waits for open connections: closing them in stop() keeps afterAll from timing out (round 602; on
  // GitHub's machines it hung past the 10 s limit, failing every CI run since 2026-11-15).
  const sessions = new Set<ServerHttp2Session>();
  server.on("session", (s) => {
    sessions.add(s);
    s.on("close", () => sessions.delete(s));
  });
  server.on("stream", (stream, headers) => {
    let body = "";
    stream.setEncoding("utf8");
    stream.on("data", (c: string) => (body += c));
    stream.on("end", () => {
      seen.push({ path: String(headers[":path"]), headers, body });
      const reply = replies.shift() ?? { status: 200 };
      stream.respond({ ":status": reply.status });
      stream.end(reply.reason ? JSON.stringify({ reason: reply.reason }) : "");
    });
  });
  return {
    seen,
    replies,
    start: () => new Promise<string>((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`))),
    stop: () =>
      new Promise<void>((resolve) => {
        for (const s of sessions) s.destroy();
        server.close(() => resolve());
      }),
  };
}

describe("the Apple push key and token", () => {
  it("reads the key as the file's text, as one base64 line, or with \\n written out", () => {
    const text = pem.trim();
    expect(readAppleKey(pem)).toBe(text);
    expect(readAppleKey(Buffer.from(pem).toString("base64"))?.trim()).toBe(text);
    expect(readAppleKey(text.replace(/\n/g, "\\n"))).toBe(text);
  });
  it("refuses a missing key, junk, and a key of the wrong kind", () => {
    expect(readAppleKey(undefined)).toBeNull();
    expect(readAppleKey("  ")).toBeNull();
    expect(readAppleKey("not a key")).toBeNull();
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    expect(readAppleKey(rsa)).toBeNull();
  });
  it("signs a token Apple can check: ES256, the key ID, the team and the time", () => {
    const [head, claims, signature] = appleToken(key, 1_800_000_000).split(".");
    expect(JSON.parse(Buffer.from(head, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toEqual({ iss: "TEAM123456", iat: 1_800_000_000 });
    const raw = Buffer.from(signature, "base64url");
    expect(raw).toHaveLength(64); // the plain r|s form Apple expects, not DER
    expect(createVerify("SHA256").update(`${head}.${claims}`).verify({ key: pair.publicKey, dsaEncoding: "ieee-p1363" }, raw)).toBe(true);
  });
  it("puts the words in the alert and the page to open beside it", () => {
    expect(appleBody(payload)).toEqual({ aps: { alert: { title: "Mango", body: "Replied to your post" }, sound: "default" }, url: "/post/1" });
  });
});

describe("sending to an iPhone", () => {
  const live = fakeApple();
  const test = fakeApple();
  let origins: string[] = [];
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  beforeAll(async () => {
    origins = [await live.start(), await test.start()];
  });
  afterEach(() => {
    for (const s of [live, test]) {
      s.seen.length = 0;
      s.replies.length = 0;
    }
    errors.mockClear();
  });
  afterAll(async () => {
    errors.mockRestore();
    await Promise.all([live.stop(), test.stop()]);
  });
  const send = (ttl = 600) => sendApple(key, "gg.smashy.ios", DEVICE, payload, ttl, origins);

  it("sends the alert to the live service with what Apple requires", async () => {
    const before = Math.floor(Date.now() / 1000);
    expect(await send(600)).toBe("sent");
    expect(test.seen).toHaveLength(0);
    const [req] = live.seen;
    expect(req.path).toBe(`/3/device/${DEVICE.toLowerCase()}`);
    expect(req.headers["apns-topic"]).toBe("gg.smashy.ios");
    expect(req.headers["apns-push-type"]).toBe("alert");
    expect(req.headers["apns-collapse-id"]).toBe("post-1");
    expect(Number(req.headers["apns-expiration"])).toBeGreaterThanOrEqual(before + 600);
    expect(String(req.headers.authorization)).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(JSON.parse(req.body)).toEqual(appleBody(payload));
  });

  it("tries the test service when the live one doesn't know the token (a build run from Xcode)", async () => {
    live.replies.push({ status: 400, reason: "BadDeviceToken" });
    expect(await send()).toBe("sent");
    expect(live.seen).toHaveLength(1);
    expect(test.seen).toHaveLength(1);
  });

  it("forgets a phone neither side knows, one whose app was removed, and another app's token", async () => {
    live.replies.push({ status: 400, reason: "BadDeviceToken" });
    test.replies.push({ status: 400, reason: "BadDeviceToken" });
    expect(await send()).toBe("gone");
    live.replies.push({ status: 410, reason: "Unregistered" });
    expect(await send()).toBe("gone");
    live.replies.push({ status: 400, reason: "DeviceTokenNotForTopic" });
    expect(await send()).toBe("gone");
  });

  it("keeps the phone when Apple has a problem of its own, or refuses the key", async () => {
    live.replies.push({ status: 503, reason: "ServiceUnavailable" });
    expect(await send()).toBe("failed");
    live.replies.push({ status: 403, reason: "InvalidProviderToken" });
    expect(await send()).toBe("failed");
    expect(test.seen).toHaveLength(0);
    expect(errors).toHaveBeenCalledTimes(2);
  });

  it("makes a new token and sends again when Apple says the token ran out", async () => {
    live.replies.push({ status: 403, reason: "ExpiredProviderToken" });
    expect(await send()).toBe("sent");
    expect(live.seen).toHaveLength(2);
  });

  it("keeps the phone when Apple can't be reached", async () => {
    expect(await sendApple(key, "gg.smashy.ios", DEVICE, payload, 600, ["http://127.0.0.1:9"])).toBe("failed");
    expect(errors).toHaveBeenCalled();
  });
});
