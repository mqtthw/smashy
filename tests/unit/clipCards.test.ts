import { describe, expect, it } from "vitest";
import { clipCaption, hashtagPattern, pickClipCards } from "@/lib/clipCards";
import { GLOSSARY, TERM_IDS } from "@/lib/glossary";

describe("clip cards", () => {
  const admins = new Set(["admin"]);
  const tags = ["wavedash", "lcancel"];

  it("takes an admin's post, and anyone's post an admin reposted", () => {
    const rows = [
      { id: "a", authorId: "someone", body: "my #wavedash" },
      { id: "b", authorId: "someone", body: "a clean #wavedash" },
      { id: "c", authorId: "admin", body: "#lcancel on hit" },
    ];
    expect(pickClipCards(rows, admins, new Set(), tags)).toEqual([{ id: "c", tag: "lcancel" }]);
    expect(pickClipCards(rows, admins, new Set(["b"]), tags)).toEqual([{ id: "b", tag: "wavedash" }, { id: "c", tag: "lcancel" }]);
  });

  it("keeps the oldest clip per term, ignores other hashtags, and reads tags in any case", () => {
    const rows = [
      { id: "old", authorId: "admin", body: "#Wavedash #fox" },
      { id: "new", authorId: "admin", body: "#wavedash again, and #lcancel" },
    ];
    expect(pickClipCards(rows, admins, new Set(), tags)).toEqual([{ id: "old", tag: "wavedash" }, { id: "new", tag: "lcancel" }]);
  });

  it("matches whole hashtags only", () => {
    const re = new RegExp(hashtagPattern(tags), "i");
    expect(re.test("see #wavedash.")).toBe(true);
    expect(re.test("#Lcancel")).toBe(true);
    expect(re.test("#wavedashing")).toBe(false);
  });

  it("makes a one-line caption without hashtags or links", () => {
    expect(clipCaption("Slide out of a jump\n#wavedash #fox https://example.com/x")).toBe("Slide out of a jump");
  });
});

describe("glossary", () => {
  it("has unique ids that work as hashtags", () => {
    expect(new Set(TERM_IDS).size).toBe(TERM_IDS.length);
    for (const id of TERM_IDS) expect(id).toMatch(/^[a-z][a-z0-9]{1,40}$/);
    expect(GLOSSARY.map((g) => g.id)).toEqual(["tournament", "basics", "melee", "ultimate"]);
  });
});
