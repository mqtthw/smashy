// Dates follow the language picked on Smashy, keeping the browser's regional style when it matches.
import { describe, expect, it } from "vitest";
import { pickDateLocale } from "@/lib/viewerTimeZone";
import { localeFor } from "@/lib/i18n/core";

describe("pickDateLocale", () => {
  it("keeps the browser's regional style in the same language", () => {
    expect(pickDateLocale("en-GB", "en")).toBe("en-GB");
    expect(pickDateLocale("es-MX", "es")).toBe("es-MX");
  });
  it("uses the picked language when the browser speaks another", () => {
    expect(pickDateLocale("en-US", "es")).toBe(localeFor("es"));
    expect(pickDateLocale("fr-FR", "ja")).toBe(localeFor("ja"));
  });
  it("never hands dates a tag they can't use (round 578)", () => {
    expect(pickDateLocale("en-US@posix", "en")).toBe(localeFor("en"));
    expect(() => new Intl.DateTimeFormat(pickDateLocale("en-US@posix", "en"))).not.toThrow();
  });
});
