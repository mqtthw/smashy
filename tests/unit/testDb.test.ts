// The test database's settings (round 814): read from .env.test.local, never the live project.
import { describe, expect, it } from "vitest";
import { LIVE_PROJECT_REF, parseEnvFile, testDbSettings } from "@/lib/testDb";

const good = { NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghij.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk", SUPABASE_SECRET_KEY: "sk" };

describe("parseEnvFile", () => {
  it("reads KEY=value lines and skips the rest", () => {
    expect(parseEnvFile('# note\nA=1\r\nB="two"\n\nlower=no\n')).toEqual({ A: "1", B: "two" });
  });
});

describe("testDbSettings", () => {
  it("takes only the three database settings", () => {
    expect(testDbSettings({ ...good, STARTGG_API_TOKEN: "x" })).toEqual({ ok: good });
  });
  it("refuses the live project", () => {
    expect(testDbSettings({ ...good, NEXT_PUBLIC_SUPABASE_URL: `https://${LIVE_PROJECT_REF}.supabase.co` })).toHaveProperty("problem");
  });
  it("refuses missing keys", () => {
    expect(testDbSettings({ NEXT_PUBLIC_SUPABASE_URL: good.NEXT_PUBLIC_SUPABASE_URL })).toHaveProperty("problem");
  });
});
