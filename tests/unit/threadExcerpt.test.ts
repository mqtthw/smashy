// A thread's two-line preview leaves out web addresses (round 839).
import { describe, expect, it } from "vitest";
import { excerpt } from "@/components/discuss/ThreadRow";

describe("excerpt", () => {
  it("drops links and tidies the spaces", () => {
    expect(excerpt("Link it if you can. Mine: RapMonster vs Zain\nhttps://www.youtube.com/watch?v=E-YAmXmyqsc\n\nThis set kicked off a rivalry.")).toBe("Link it if you can. Mine: RapMonster vs Zain This set kicked off a rivalry.");
    expect(excerpt("see www.example.com/x for more")).toBe("see for more");
  });
  it("is empty when the post is only a link", () => {
    expect(excerpt("https://x.com/a/status/1")).toBe("");
  });
});
