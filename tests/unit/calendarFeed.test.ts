// A region's calendar feed: several events in one file, with a name and a refresh hint for calendar apps.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("calendar feed", () => {
  it("holds every event, named, and the one-event file has no feed name", async () => {
    const { calendarFeed, calendarFile } = await import("@/lib/rsvps");
    const e = (id: string) => ({ uid: `t-${id}`, name: `Weekly ${id}`, startAt: 1790000000, endAt: null, location: null, url: `https://x.test/${id}` });
    const feed = calendarFeed("Smash in Texas · Smashy", [e("1"), e("2"), e("3")]);
    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(feed).toContain("X-WR-CALNAME:Smash in Texas · Smashy");
    expect(feed).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
    expect(feed.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    const one = calendarFile(e("1"));
    expect(one).not.toContain("X-WR-CALNAME");
    expect(one.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(calendarFeed("Empty", [])).not.toContain("BEGIN:VEVENT");
  });
});
