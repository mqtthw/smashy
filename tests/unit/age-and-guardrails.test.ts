import { describe, expect, it } from "vitest";
import { ageFromBirthdate, parseBirthdate } from "@/lib/age";
import { contactInfoReason } from "@/lib/guardrails";

describe("ageFromBirthdate", () => {
  const today = new Date(Date.UTC(2026, 10, 6)); // Nov 6, 2026
  it.each([
    ["2013-11-06", 13], // 13th birthday today
    ["2013-11-07", 12], // the day before turning 13
    ["2013-11-05", 13],
    ["2008-11-06", 18],
    ["2008-11-07", 17],
    ["2000-02-29", 26], // leap day
  ])("%s is %i", (dob, age) => {
    expect(ageFromBirthdate(dob, today)).toBe(age);
  });
});

describe("parseBirthdate", () => {
  it("accepts real dates, including leap days", () => {
    expect(parseBirthdate("2004-02-29")).toBe("2004-02-29");
  });
  it.each(["2000-02-30", "2001-02-29", "2099-01-01", "1899-12-31", "abc", "", null, undefined])("rejects %s", (v) => {
    expect(parseBirthdate(v as string | null | undefined)).toBeNull();
  });
});

describe("contactInfoReason (chat/lobby/bio filter)", () => {
  it.each([
    "gg that was close, won 3-2 then 2-1",
    "anyone down for friendlies? fox main",
    "add me to the bracket pls",
    "ig i need to practice more",
    "lmao 0-death combo at 120%",
    "slippi code is ABCD#123 in the lobby",
    "bracket at 7pm, $5 entry",
    "1000000 hours of practice",
  ])("allows normal smash talk: %s", (text) => {
    expect(contactInfoReason(text)).toBeNull();
  });

  it.each([
    "check www.example.com",
    "join https://discord.gg/abc",
    "email me at kid@gmail.com",
    "call 210-555-1234",
    "text me 2105551234",
    "follow @smashkid",
    "add me on snap",
    "whats my discord? hmu",
    "my insta is smashkid",
    "dm me on telegram",
    "my discord is smashkid",
  ])("blocks contact sharing: %s", (text) => {
    expect(contactInfoReason(text)).not.toBeNull();
  });
});
