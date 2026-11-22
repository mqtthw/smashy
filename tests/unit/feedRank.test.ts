import { describe, expect, it } from "vitest";
import { spreadAuthors } from "@/lib/feedRank";

const items = (authors: string) => authors.split("").map((a, i) => ({ i, post: { author: { id: a } } }));
const order = (xs: ReturnType<typeof items>) => xs.map((x) => x.post.author.id).join("");

describe("spreadAuthors", () => {
  it("leaves a page alone when nobody appears 3 times in a row", () => {
    expect(order(spreadAuthors(items("aabab")))).toBe("aabab");
  });
  it("moves the next different person up so no one appears 3 times in a row", () => {
    expect(order(spreadAuthors(items("aaab")))).toBe("aaba");
    expect(order(spreadAuthors(items("aaaabc")))).toBe("aabaac");
  });
  it("keeps the order when there is nobody else to move up", () => {
    expect(order(spreadAuthors(items("aaaa")))).toBe("aaaa");
  });
  it("keeps every item", () => {
    const out = spreadAuthors(items("aaaaabbbcc"));
    expect(out.map((x) => x.i).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
