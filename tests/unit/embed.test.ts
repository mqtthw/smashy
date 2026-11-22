import { describe, expect, it } from "vitest";
import { embedSnippet, outsideLink } from "@/lib/embed";

const ID = "3f2b0c1e-1111-4222-8333-444455556666";

describe("embedSnippet", () => {
  it("makes an iframe that points at the event's embed page", () => {
    const code = embedSnippet("https://smashy.example", ID, "Friday Night Smash #4");
    expect(code).toBe(
      `<iframe src="https://smashy.example/host/${ID}/embed" title="Friday Night Smash #4 bracket" width="100%" height="640" style="border:0;max-width:100%" loading="lazy"></iframe>`,
    );
  });

  it("keeps an event name from breaking out of the title", () => {
    const code = embedSnippet("https://smashy.example", ID, `"><script>alert(1)</script> & co`);
    expect(code).not.toContain("<script>");
    expect(code).toContain(`title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; co bracket"`);
    // Still one tag: one opening iframe and its closing tag.
    expect(code.match(/</g)).toHaveLength(2);
  });

  it("has a title even when the name is blank", () => {
    expect(embedSnippet("https://smashy.example", ID, "  ")).toContain(`title="Smashy bracket"`);
  });

  it("takes another height", () => {
    expect(embedSnippet("https://smashy.example", ID, "Weekly", 900)).toContain(`height="900"`);
  });
});

describe("outsideLink", () => {
  const here = `https://smashy.example/host/${ID}/embed?group=1`;

  it("lets links on the same page through: another pool, a jump to a round", () => {
    expect(outsideLink(`/host/${ID}/embed?group=2`, here)).toBeNull();
    expect(outsideLink("#round-w1", here)).toBeNull();
    expect(outsideLink(here, here)).toBeNull();
  });

  it("opens every other Smashy page outside the frame", () => {
    expect(outsideLink("/host/set/abc", here)).toBe("https://smashy.example/host/set/abc");
    expect(outsideLink(`/host/${ID}`, here)).toBe(`https://smashy.example/host/${ID}`);
    expect(outsideLink(`/host/${ID}/bracket`, here)).toBe(`https://smashy.example/host/${ID}/bracket`);
    expect(outsideLink("/u/alice", here)).toBe("https://smashy.example/u/alice");
  });

  it("opens other sites outside the frame, even at the same path", () => {
    expect(outsideLink(`https://elsewhere.example/host/${ID}/embed`, here)).toBe(`https://elsewhere.example/host/${ID}/embed`);
  });

  it("leaves non-web links alone", () => {
    expect(outsideLink("mailto:to@example.com", here)).toBeNull();
    expect(outsideLink("javascript:void(0)", here)).toBeNull();
  });

  it("copes with an address it can't read", () => {
    expect(outsideLink("/x", "not an address")).toBeNull();
  });
});
