import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { firstGrapheme, tintFor } from "@/components/ui/Avatar";
import { hasMutedWord } from "@/lib/posts";
import { calendarFile, eventHref, weeklyRef } from "@/lib/rsvps";
import { timeAgo } from "@/lib/timeAgo";

const post = (body: string, extra: Partial<Parameters<typeof hasMutedWord>[0]> = {}) => ({ body, quote: null, poll: null, ...extra });

describe("muted words", () => {
  it("matches whole words and phrases, ignoring case", () => {
    expect(hasMutedWord(post("Huge SPOILERS for Genesis"), ["spoilers"])).toBe(true);
    expect(hasMutedWord(post("top 8 at genesis today"), ["top 8"])).toBe(true);
    expect(hasMutedWord(post("foxtrot is a dance"), ["fox"])).toBe(false);
    expect(hasMutedWord(post("the fox, again"), ["fox"])).toBe(true);
    expect(hasMutedWord(post("nothing here"), [])).toBe(false);
  });
  it("checks quoted posts and poll choices too", () => {
    expect(hasMutedWord(post("look", { quote: { id: "q", body: "big drama", title: null, spoiler: false, createdAt: "", author: { tag: "a", handle: "a" }, image: null, imageCount: 0, videoPoster: null } }), ["drama"])).toBe(true);
    expect(hasMutedWord(post("vote", { poll: { options: ["Fox", "Marth"], closesAt: "", counts: [0, 0], total: 0, myChoice: null } }), ["marth"])).toBe(true);
  });
});

describe("events", () => {
  it("links RSVPs back to the right page", () => {
    expect(eventHref("tournament", "tournament/smash-cafe-42")).toBe("/events/tournament/smash-cafe-42");
    expect(eventHref("weekly", weeklyRef("satx-weekly", 1790000000))).toBe("/events/weekly/satx-weekly");
  });
  it("makes a valid calendar file", () => {
    const ics = calendarFile({ uid: "t-1", name: "Smash, Cafe; #42", startAt: 1790000000, endAt: null, location: "123 Main St, San Antonio", url: "https://x.test/e" });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Smash\\, Cafe\\; #42");
    expect(ics).toContain("DTEND:"); // 4 hours if start.gg has no end time
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});

describe("avatars and times", () => {
  it("uses the whole first character, even an emoji", () => {
    expect(firstGrapheme("👍🏽 Bjorn")).toBe("👍🏽");
    expect(firstGrapheme("  mango")).toBe("M");
    expect(firstGrapheme("")).toBe("?");
  });
  it("picks the same color for the same name", () => {
    expect(tintFor("Mango")).toBe(tintFor("mango"));
  });
  it("shows short relative times", () => {
    const now = Date.parse("2026-11-07T12:00:00Z") / 1000;
    expect(timeAgo("2026-11-07T11:59:30Z", now)).toBe("now");
    expect(timeAgo("2026-11-07T11:30:00Z", now)).toBe("30m");
    expect(timeAgo("2026-11-07T09:00:00Z", now)).toBe("3h");
  });
});

describe("essentials", () => {
  it("links frame data for every Ultimate character, and none for other games", async () => {
    const { frameDataLinks, GAME_ESSENTIALS } = await import("@/lib/essentials");
    const { CHARACTERS } = await import("@/lib/characters");
    for (const c of CHARACTERS.ultimate) expect(frameDataLinks("ultimate", c.key, c.name).length, c.key).toBeGreaterThan(0);
    expect(frameDataLinks("ultimate", "pokemon-trainer", "Pokémon Trainer").map((l) => l.url)).toEqual([
      "https://ultimateframedata.com/pt_squirtle", "https://ultimateframedata.com/pt_ivysaur", "https://ultimateframedata.com/pt_charizard",
    ]);
    expect(frameDataLinks("ultimate", "king-k-rool", "King K. Rool")[0].url).toBe("https://ultimateframedata.com/king_k_rool");
    expect(frameDataLinks("melee", "mr-game-and-watch", "Mr. Game & Watch")[0].url).toBe("https://www.ssbwiki.com/Mr._Game_%26_Watch_(SSBM)");
    expect(frameDataLinks("pplus", "fox", "Fox")).toEqual([]);
    // Must-haves stay numbered at the top (Slippi first); the rest sit under "General resources" at the bottom.
    expect(GAME_ESSENTIALS.melee!.filter((e) => !e.general).map((e) => e.title)).toEqual(["Slippi", "UnclePunch Training Mode", "Netplay+"]);
    expect(GAME_ESSENTIALS.melee!.filter((e) => e.general).map((e) => e.title)).toEqual(["IKneeData calculator", "Melee Fundamentals for Improvement", "Cookbook.gg", "Melee Unlocked", "4Stockfish"]);
  });

  it("sorts library links into the same types as the resource tabs", async () => {
    const { libraryType, CHARACTER_LIBRARIES } = await import("@/lib/essentials");
    // Matthew's example: Melee Bowser's Discord combo videos must show under "Combo video".
    const bowser = CHARACTER_LIBRARIES.melee!.bowser!.links.filter((l) => /combo video/i.test(l.title));
    expect(bowser.length).toBeGreaterThan(0);
    for (const l of bowser) expect(libraryType(l), l.title).toBe("combo_video");
    expect(libraryType({ title: "Mewtwo combo guide (video)", url: "https://www.youtube.com/watch?v=x", group: "Punishes & data" })).toBe("combo_video");
    expect(libraryType({ title: "Back throw kill percents at ledge", url: "https://docs.google.com/x", group: "Punishes & data" })).toBe("frame_data");
    expect(libraryType({ title: "Snake singles VODs (playlist)", url: "https://www.youtube.com/playlist?list=x", group: "Matchups" })).toBe("vod");
    expect(libraryType({ title: "Steve's options vs every ledge hang", url: "https://docs.google.com/x", group: "Punishes & data" })).toBe("frame_data");
    expect(libraryType({ title: "How to ADC (air dodge cancel) (video)", url: "https://www.youtube.com/watch?v=x", group: "Punishes & data" })).toBe("tech");
    expect(libraryType({ title: "Some Discord", url: "https://discord.gg/abc", group: "Community" })).toBe("other");
    expect(libraryType({ title: "Art of Wolf (video)", url: "https://www.youtube.com/watch?v=x", group: "General Melee" })).toBe("guide");
  });
});

describe("error log", () => {
  it("groups repeats of the same error, whatever the ids", async () => {
    const { errorFingerprint } = await import("@/lib/errorLog");
    const a = errorFingerprint("server", "Post 3f2b1c4d-1111-2222-3333-444455556666 not found (render /post/[id])", "/post/3f2b1c4d-1111-2222-3333-444455556666?x=1");
    const b = errorFingerprint("server", "Post 9a9b9c9d-aaaa-bbbb-cccc-ddddeeeeffff not found (render /post/[id])", "/post/9a9b9c9d-aaaa-bbbb-cccc-ddddeeeeffff");
    expect(a).toBe(b);
    expect(errorFingerprint("browser", "x", "/a")).not.toBe(errorFingerprint("server", "x", "/a"));
  });
});

describe("reel quality", () => {
  it("spots junk clips", async () => {
    const { isLowQualityClip } = await import("@/lib/reelQuality");
    expect(isLowQualityClip("VGBC Zenni 5", 400)).toBe(true); // sponsor ad
    expect(isLowQualityClip("test", 400)).toBe(true);
    expect(isLowQualityClip("f", 400)).toBe(true);
    expect(isLowQualityClip("?!.", 400)).toBe(true);
    expect(isLowQualityClip("Hbox Ness 0-Death", 3)).toBe(true); // barely watched
    expect(isLowQualityClip("Hbox Ness 0-Death", 40)).toBe(false);
    expect(isLowQualityClip("バグの片鱗", 220)).toBe(false); // non-English titles are fine
    expect(isLowQualityClip("Great play", 60, 50)).toBe(false);
    expect(isLowQualityClip("Great play", 40, 50)).toBe(true);
  });
});

describe("translate button", () => {
  it("shows for other languages, not your own", async () => {
    const { looksForeign } = await import("@/lib/looksForeign");
    expect(looksForeign("バグの片鱗", "en-US")).toBe(true);
    expect(looksForeign("バグの片鱗", "ja-JP")).toBe(false);
    expect(looksForeign("¿Quién va al torneo el sábado? Yo voy con mi equipo", "en-US")).toBe(true);
    expect(looksForeign("¿Quién va al torneo el sábado? Yo voy con mi equipo", "es-MX")).toBe(false);
    expect(looksForeign("Who is going to the tournament this weekend?", "es-MX")).toBe(true);
    expect(looksForeign("Who is going to the tournament this weekend?", "en-US")).toBe(false);
    expect(looksForeign("GG", "en-US")).toBe(false); // too short to tell
    expect(looksForeign("Zain 0-death on Hbox #ssbm", "en-US")).toBe(false); // names and tags aren't a language
  });
});

describe("improvements round 5", () => {
  it("matches cities by whole name, with nicknames", async () => {
    const { sameCity } = await import("@/lib/cityMatch");
    expect(sameCity("San Antonio", "San Antonio, TX")).toBe(true);
    expect(sameCity("SATX", "San Antonio")).toBe(true);
    expect(sameCity("san antonio, texas", "San Antonio")).toBe(true);
    expect(sameCity("SA", "Pasadena")).toBe(false);
    expect(sameCity("Austin", "San Antonio")).toBe(false);
    expect(sameCity("", "Austin")).toBe(false);
    expect(sameCity("ATX", "Austin")).toBe(true);
    expect(sameCity("HTX", "Houston, TX")).toBe(true);
    expect(sameCity("Toronto, ON", "Toronto")).toBe(true);
    expect(sameCity("Columbus", "Columbus, OH")).toBe(true);
    expect(sameCity("San Antonio TX", "San Antonio")).toBe(true);
  });
  it("doesn't offer to translate English for readers Smashy can't translate into", async () => {
    const { looksForeign, targetLanguage } = await import("@/lib/looksForeign");
    expect(targetLanguage("ru-RU")).toBe("en");
    expect(looksForeign("Who is going to the tournament this weekend?", "ru-RU")).toBe(false);
    expect(looksForeign("バグの片鱗", "ru-RU")).toBe(true);
  });
  it("folds calendar lines without breaking emoji", async () => {
    const { calendarFile } = await import("@/lib/rsvps");
    const ics = calendarFile({ uid: "t", name: `${"Smash ".repeat(11)}🔥🔥 Weekly`, startAt: 1790000000, endAt: null, location: null, url: "https://x.test" });
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n /g, "")).toContain("🔥🔥 Weekly");
  });
  it("explains a suspended account in plain words", async () => {
    const { authErrorCode } = await import("@/lib/authErrors");
    expect(authErrorCode("User is banned")).toBe("banned");
    expect(authErrorCode("Email link is invalid or has expired")).toBe("expired");
  });
});

describe("regions", () => {
  it("knows regions and how to search start.gg for them", async () => {
    const { isRegion, regionName, startggRegionFilter, regionFromGeo } = await import("@/lib/regions");
    expect(isRegion("US-TX")).toBe(true);
    expect(isRegion("CA-ON")).toBe(true);
    expect(isRegion("JP")).toBe(true);
    expect(isRegion("TX")).toBe(false);
    expect(regionName("CA-ON")).toBe("Ontario");
    expect(startggRegionFilter("US-CA")).toEqual({ countryCode: "US", addrState: "CA" });
    expect(startggRegionFilter("JP")).toEqual({ countryCode: "JP" });
    expect(regionFromGeo("US", "TX")).toBe("US-TX");
    expect(regionFromGeo("CA", "BC")).toBe("CA-BC");
    expect(regionFromGeo("JP", "13")).toBe("JP");
    expect(regionFromGeo("ZZ", null)).toBeNull();
    expect(regionFromGeo(null, null)).toBeNull();
  });
});

describe("time zones", () => {
  it("shows dates in the reader's time zone", async () => {
    const { timeAgo, fullTime } = await import("@/lib/timeAgo");
    const iso = "2026-11-08T03:30:00Z"; // Nov 7, 9:30 PM in Texas; Nov 8, 12:30 PM in Tokyo
    const later = Date.parse("2026-11-20T00:00:00Z") / 1000;
    expect(timeAgo(iso, later, "America/Chicago")).toBe("Nov 7");
    expect(timeAgo(iso, later, "Asia/Tokyo")).toBe("Nov 8");
    expect(fullTime(iso, "Asia/Tokyo")).toMatch(/Nov 8, 12:30 PM/);
  });
});

describe("round 6", () => {
  it("writes cities the way people do", async () => {
    const { displayCity } = await import("@/lib/cityMatch");
    expect(displayCity("satx")).toBe("San Antonio");
    expect(displayCity("Columbus, OH")).toBe("Columbus");
  });
  it("puts Puerto Rico under its own country code (as start.gg does)", async () => {
    const { startggRegionFilter, regionFromGeo, isRegion } = await import("@/lib/regions");
    expect(isRegion("PR")).toBe(true);
    expect(isRegion("US-PR")).toBe(false);
    expect(startggRegionFilter("PR")).toEqual({ countryCode: "PR" });
    expect(regionFromGeo("PR", "PR")).toBe("PR");
    expect(regionFromGeo("IN", "MH")).toBe("IN");
  });
  it("shows the year on dates from another year", async () => {
    const { timeAgo } = await import("@/lib/timeAgo");
    const now = Date.parse("2027-03-01T12:00:00Z") / 1000;
    expect(timeAgo("2026-11-07T18:00:00Z", now, "America/Chicago")).toBe("Nov 7, 2026");
    expect(timeAgo("2027-01-15T18:00:00Z", now, "America/Chicago")).toBe("Jan 15");
    expect(timeAgo("2027-01-15T18:00:00Z", now, "Europe/London", "en-GB")).toBe("15 Jan");
  });
});

describe("bracket times", () => {
  it("names brackets with their game and sorts them by start", async () => {
    const { bracketName, byStart } = await import("@/components/events/EventTimes");
    expect(bracketName("Singles", "melee")).toBe("Melee Singles");
    expect(bracketName("Ultimate Singles", "ultimate")).toBe("Ultimate Singles");
    expect(bracketName("SSBU Doubles", "ultimate")).toBe("SSBU Doubles");
    expect(byStart([{ startAt: 300 }, { startAt: null }, { startAt: 100 }]).map((e) => e.startAt)).toEqual([100, 300, null]);
  });
  it("predicts a weekly's bracket times from its last edition", async () => {
    const { predictWeeklies } = await import("@/lib/weeklies");
    const day = 86400;
    const base = Date.parse("2026-10-05T00:00:00Z") / 1000; // a Sunday 7 PM in Texas (Monday 00:00 UTC)
    const ed = (i: number) => ({
      id: `t${i}`, slug: `the-contract-${i}`, name: `The Contract #${200 + i}`, city: "San Antonio", venueName: null, venueAddress: null,
      startAt: base + i * 7 * day, endAt: null, timezone: "America/Chicago", numAttendees: 40, isRegistrationOpen: false, imageUrl: null,
      bannerUrl: null, startggUrl: "", registerUrl: "", streams: [],
      events: [
        { id: `s${i}`, name: "Ultimate Singles", game: "ultimate" as const, startAt: base + i * 7 * day, numEntrants: 40 },
        { id: `d${i}`, name: "Ultimate Doubles", game: "ultimate" as const, startAt: base + i * 7 * day - 3600, numEntrants: 12 },
      ],
    });
    const recent = [0, 1, 2, 3].map(ed);
    const now = base + 3 * 7 * day + 2 * day;
    const [w] = predictWeeklies(recent as never, [], now);
    expect(w.events.find((e) => e.name === "Ultimate Doubles")!.startAt).toBe(w.startAt - 3600); // doubles an hour earlier
  });
});

describe("fresh Reels: the view bar rises with a clip's age", () => {
  it("lets a new clip in with fewer views, and asks for the full bar after a week", async () => {
    const { topClipMinViews, TOP_CLIP_MIN_VIEWS, TOP_CLIP_WINDOWS_DAYS } = await import("@/lib/reelQuality");
    const now = Date.parse("2026-11-09T12:00:00Z");
    const ago = (h: number) => new Date(now - h * 3600e3).toISOString();
    expect(topClipMinViews(ago(2), now)).toBe(20);
    expect(topClipMinViews(ago(48), now)).toBe(30);
    expect(topClipMinViews(ago(5 * 24), now)).toBe(40);
    expect(topClipMinViews(ago(10 * 24), now)).toBe(TOP_CLIP_MIN_VIEWS);
    expect(TOP_CLIP_WINDOWS_DAYS[0]).toBe(1);
    expect(TOP_CLIP_WINDOWS_DAYS.at(-1)).toBe(30);
  });
});
