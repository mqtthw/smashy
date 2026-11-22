import { describe, expect, it } from "vitest";
import { validPushKeys } from "@/lib/pushKeys";

const b64url = (bytes: number[]) => Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const key = b64url([4, ...Array.from({ length: 64 }, (_, i) => i)]); // 65 bytes, starts with 0x04, like a browser's
const secret = b64url(Array.from({ length: 16 }, (_, i) => 200 - i));

describe("validPushKeys", () => {
  it("accepts keys shaped like a browser's", () => {
    expect(key).toHaveLength(87);
    expect(validPushKeys(key, secret)).toBe(true);
    expect(validPushKeys(`${key}=`, `${secret}==`)).toBe(true); // padded is fine too
  });
  it("refuses keys of the wrong size or shape", () => {
    expect(validPushKeys(key.slice(0, 60), secret)).toBe(false); // too short: the live error
    expect(validPushKeys(b64url([5, ...Array.from({ length: 64 }, () => 1)]), secret)).toBe(false); // not 0x04
    expect(validPushKeys(key, secret.slice(0, 10))).toBe(false);
    expect(validPushKeys("not base64!", secret)).toBe(false);
    expect(validPushKeys("", "")).toBe(false);
  });
});

describe("push addresses (round 692)", () => {
  it("accepts the browsers' real push services", async () => {
    const { validPushEndpoint } = await import("@/lib/pushKeys");
    for (const u of [
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/QAbc",
      "https://wns2-bn3p.notify.windows.com/w/?token=abc",
    ]) expect(validPushEndpoint(u)).toBe(true);
  });
  it("refuses any other host", async () => {
    const { validPushEndpoint } = await import("@/lib/pushKeys");
    for (const u of [
      "https://evil.example/fcm.googleapis.com",
      "https://fcm.googleapis.com.evil.example/x",
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://user:pw@fcm.googleapis.com/x",
      "https://fcm.googleapis.com:8443/x",
      "https://169.254.169.254/latest",
      "not a url",
    ]) expect(validPushEndpoint(u)).toBe(false);
  });
});
