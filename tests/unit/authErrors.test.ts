// The sign-in page shows only Smashy's own error codes, in the reader's language (round 683).
import { describe, expect, it } from "vitest";
import { authErrorCode, authErrorText, readAuthErrorCode, signinErrorPath } from "@/lib/authErrors";
import { translate } from "@/lib/i18n/core";

describe("sign-in error codes", () => {
  it("sorts Supabase's messages into a few kinds", () => {
    expect(authErrorCode("User is banned")).toBe("banned");
    expect(authErrorCode("Token has expired or is invalid")).toBe("expired");
    expect(authErrorCode("email rate limit exceeded")).toBe("rate");
    expect(authErrorCode("Something odd happened")).toBe("failed");
    expect(authErrorCode(undefined)).toBe("failed");
  });
  it("never shows words taken from the address", () => {
    expect(readAuthErrorCode("expired")).toBe("expired");
    expect(readAuthErrorCode("Your account is locked, email scam@example.com")).toBeNull();
    expect(readAuthErrorCode(["expired"])).toBeNull();
    expect(readAuthErrorCode(undefined)).toBeNull();
    expect(signinErrorPath("again")).toBe("/signin?error=again");
  });
  it("words each code in the reader's language", () => {
    const en = (k: Parameters<typeof translate>[1], v?: Parameters<typeof translate>[2]) => translate("en", k, v);
    const es = (k: Parameters<typeof translate>[1], v?: Parameters<typeof translate>[2]) => translate("es", k, v);
    expect(authErrorText(en, "expired")).toMatch(/expired/);
    expect(authErrorText(es, "expired")).toMatch(/caduc/);
    expect(authErrorText(en, "User is banned")).toContain("@");
    expect(authErrorText(en, "again")).toBe("Please sign in again.");
  });
});

describe("connecting a second sign-in method (round 684)", () => {
  it("knows a Google or Discord account that belongs to someone else", () => {
    expect(authErrorCode("Identity is already linked to another user")).toBe("inUse");
    expect(readAuthErrorCode("inUse")).toBe("inUse");
  });
  it("lists the ways into an account, email first, once each", async () => {
    const { signInProviders } = await import("@/lib/signInMethods");
    expect(signInProviders([{ provider: "discord" }, { provider: "discord" }], "a@b.co")).toEqual(["email", "discord"]);
    expect(signInProviders([{ provider: "email" }, { provider: "google" }], "a@b.co")).toEqual(["email", "google"]);
    expect(signInProviders([{ provider: "apple" }], null)).toEqual(["apple"]);
    expect(signInProviders(null, null)).toEqual([]);
  });
});
