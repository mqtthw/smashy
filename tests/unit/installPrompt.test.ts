// Which store the "Get the Smashy app" card sends a phone to (round 642).
import { describe, expect, it } from "vitest";
import { SIGNING_UP, storeFor } from "@/components/InstallPrompt";

describe("the app store for this phone", () => {
  it("sends iPhones and iPads to the App Store, in any browser", () => {
    expect(storeFor("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("apple");
    expect(storeFor("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/131.0 Mobile/15E148 Safari/604.1")).toBe("apple");
    expect(storeFor("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", 5)).toBe("apple"); // an iPad asking for the desktop site
  });
  it("sends Android phones to Google Play, and nothing else anywhere", () => {
    expect(storeFor("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36")).toBe("google");
    expect(storeFor("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", 0)).toBeNull();
    expect(storeFor("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36")).toBeNull();
  });
});

describe("SIGNING_UP (round 681)", () => {
  it("keeps the app banner off the sign-in and sign-up pages only", () => {
    for (const p of ["/signin", "/signin/", "/welcome", "/welcome/x"]) expect(SIGNING_UP.test(p)).toBe(true);
    for (const p of ["/", "/signing", "/welcomes", "/events", "/u/welcome"]) expect(SIGNING_UP.test(p)).toBe(false);
  });
});
