import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { checkReport, parseTarget } from "@/lib/historyReports";

describe("parseTarget", () => {
  it("reads a major or a moment from the picker", () => {
    expect(parseTarget("major:genesis-5")).toEqual({ majorSlug: "genesis-5" });
    expect(parseTarget("major:manual/2004-some-major")).toEqual({ majorSlug: "manual/2004-some-major" });
    expect(parseTarget("moment:0b9a986c-1d4f-4e60-a026-2783dd9600dd")).toEqual({ momentId: "0b9a986c-1d4f-4e60-a026-2783dd9600dd" });
  });
  it("refuses anything else", () => {
    expect(parseTarget("")).toBeNull();
    expect(parseTarget("major:")).toBeNull();
    expect(parseTarget("moment:not-an-id")).toBeNull();
    expect(parseTarget("post:123")).toBeNull();
  });
});

describe("checkReport", () => {
  it("keeps the message and an https source", () => {
    expect(checkReport("  The date is   a day off ", "https://liquipedia.net/x")).toEqual({ message: "The date is a day off", link: "https://liquipedia.net/x" });
    expect(checkReport("The date is a day off", "")).toEqual({ message: "The date is a day off", link: null });
  });
  it("refuses a too-short message or a bad link", () => {
    expect(checkReport("bad", "")).toEqual({ error: { key: "history.report.err.message" } });
    expect(checkReport("The date is a day off", "http://x.y")).toEqual({ error: { key: "history.err.sourceHttps" } });
  });
});
