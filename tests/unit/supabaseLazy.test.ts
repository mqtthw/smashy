import { afterEach, describe, expect, it, vi } from "vitest";
import { maybeSignedIn } from "@/lib/supabase/lazy";
import { subscribeAsUser } from "@/lib/supabase/realtime";

afterEach(() => vi.unstubAllGlobals());

describe("telling a guest apart without loading Supabase", () => {
  it("sees the login cookie, whole or split in parts", () => {
    vi.stubGlobal("document", { cookie: "theme=dark; sb-abc-auth-token=base64-xyz" });
    expect(maybeSignedIn()).toBe(true);
    vi.stubGlobal("document", { cookie: "sb-abc-auth-token.0=part; sb-abc-auth-token.1=part" });
    expect(maybeSignedIn()).toBe(true);
  });

  it("says guest when there is no login cookie", () => {
    vi.stubGlobal("document", { cookie: "theme=dark" });
    expect(maybeSignedIn()).toBe(false);
  });

  it("says yes when cookies can't be read, so a member never loses a feature", () => {
    vi.stubGlobal("document", {
      get cookie(): string {
        throw new Error("blocked");
      },
    });
    expect(maybeSignedIn()).toBe(true);
  });
});

describe("a members-only live channel", () => {
  it("does nothing at all for a guest", async () => {
    vi.stubGlobal("document", { cookie: "" });
    const build = vi.fn();
    const stop = subscribeAsUser(build, { signedInOnly: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(build).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });
});
