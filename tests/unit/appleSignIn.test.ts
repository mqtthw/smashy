// Sign in with Apple on the server (lib/appleSignIn.ts) with a throwaway key and a stand-in for Apple.
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { clientSecret, refreshTokenFor, revokeRefreshToken, signinKeyFromEnv, type SigninKey } from "@/lib/appleSignIn";

const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = pair.privateKey.export({ type: "pkcs8", format: "pem" }) as string;
const key: SigninKey = { teamId: "TEAM123456", keyId: "KEY1234567", privateKey: pem, clientId: "gg.smashy.ios" };

/** A stand-in for Apple: records the form it was sent and answers with `status` and `body`. */
function fakeApple(status: number, body: object) {
  const calls: { url: string; form: URLSearchParams }[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), form: init?.body as URLSearchParams });
    return new Response(JSON.stringify(body), { status });
  });
  return { calls, impl: impl as unknown as typeof fetch };
}

describe("Sign in with Apple, server side", () => {
  it("is off until both settings are there", () => {
    expect(signinKeyFromEnv({})).toBeNull();
    expect(signinKeyFromEnv({ APPLE_SIGNIN_KEY_ID: "ABC" })).toBeNull();
    expect(signinKeyFromEnv({ APPLE_SIGNIN_KEY_ID: "ABC", APPLE_SIGNIN_KEY: Buffer.from(pem).toString("base64") })?.clientId).toBe("gg.smashy.ios");
  });
  it("signs a client secret Apple can check", () => {
    const [head, claims, sig] = clientSecret(key, 1_800_000_000).split(".");
    expect(JSON.parse(Buffer.from(head, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toEqual({ iss: "TEAM123456", iat: 1_800_000_000, exp: 1_800_003_600, aud: "https://appleid.apple.com", sub: "gg.smashy.ios" });
    expect(createVerify("SHA256").update(`${head}.${claims}`).verify({ key: pair.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"))).toBe(true);
  });
  it("trades the app's one-time code for a refresh token", async () => {
    const apple = fakeApple(200, { refresh_token: "r.abc123", access_token: "a" });
    expect(await refreshTokenFor(key, "c.code123456", apple.impl)).toBe("r.abc123");
    expect(apple.calls[0].url).toBe("https://appleid.apple.com/auth/token");
    expect(apple.calls[0].form.get("grant_type")).toBe("authorization_code");
    expect(apple.calls[0].form.get("code")).toBe("c.code123456");
    expect(apple.calls[0].form.get("client_id")).toBe("gg.smashy.ios");
  });
  it("gives nothing back when Apple refuses the code", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await refreshTokenFor(key, "c.used123456", fakeApple(400, { error: "invalid_grant" }).impl)).toBeNull();
    errors.mockRestore();
  });
  it("revokes the refresh token when the account is deleted", async () => {
    const apple = fakeApple(200, {});
    expect(await revokeRefreshToken(key, "r.abc123", apple.impl)).toBe(true);
    expect(apple.calls[0].url).toBe("https://appleid.apple.com/auth/revoke");
    expect(apple.calls[0].form.get("token")).toBe("r.abc123");
    expect(apple.calls[0].form.get("token_type_hint")).toBe("refresh_token");
  });
});
