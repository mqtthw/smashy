import { describe, expect, it } from "vitest";
import { cleanPublicText } from "@/lib/wordFilter";

describe("cleanPublicText (clip titles)", () => {
  it("leaves normal smash titles alone", () => {
    for (const t of ["close set", "the longest upsmash kill of all time", "Classic Fox shine spike", "pass the controller", "Scunthorpe"]) {
      expect(cleanPublicText(t)).toEqual({ text: t, flagged: false });
    }
  });

  it("masks everyday swearing instead of hiding it", () => {
    expect(cleanPublicText("what the fuck was that")).toEqual({ text: "what the f*** was that", flagged: false });
    expect(cleanPublicText("holy shit")).toEqual({ text: "holy s***", flagged: false });
  });

  it("hides and flags slurs, including letter swaps", () => {
    expect(cleanPublicText("you retard")).toEqual({ text: "", flagged: true });
    expect(cleanPublicText("r3t4rd move")).toEqual({ text: "", flagged: true });
  });

  it("hides and flags sexual content and links", () => {
    expect(cleanPublicText("NSFW clip")).toEqual({ text: "", flagged: true });
    expect(cleanPublicText("follow me at twitch.tv/someone")).toEqual({ text: "", flagged: true });
  });

  it("doesn't flag words that merely contain a short blocked word", () => {
    expect(cleanPublicText("cucumber combo").flagged).toBe(false);
    expect(cleanPublicText("spicy ledgedash").flagged).toBe(false);
  });
});
