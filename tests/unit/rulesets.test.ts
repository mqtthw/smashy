import { describe, expect, it } from "vitest";
import { allFields, displayValue, sameValue, sanitizeRules } from "@/lib/rulesetFields";

describe("sanitizeRules", () => {
  it("keeps valid values and drops unknown or out-of-range ones", () => {
    const rules = sanitizeRules("melee", {
      stocks: "4",
      timer: "999", // out of range
      dsr: "standard",
      gentlemans: "true",
      starters: ["Battlefield", "Final Destination", "Battlefield", "  "],
      starters_custom: "ignored",
      hacker_field: "<script>",
      wobbling: "false",
    });
    expect(rules).toEqual({
      stocks: 4,
      dsr: "standard",
      gentlemans: true,
      starters: ["Battlefield", "Final Destination"],
      wobbling: false,
    });
  });

  it("rejects select values that aren't options", () => {
    expect(sanitizeRules("ultimate", { dsr: "anything" })).toEqual({});
  });
});

describe("sameValue", () => {
  it("compares stage lists as sets", () => {
    expect(sameValue(["Battlefield", "Final Destination"], ["Final Destination", "Battlefield"])).toBe(true);
    expect(sameValue(["Battlefield"], ["Battlefield", "Final Destination"])).toBe(false);
  });
  it("treats empty and missing the same", () => {
    expect(sameValue(undefined, [])).toBe(true);
    expect(sameValue("", null)).toBe(true);
  });
});

describe("displayValue", () => {
  const field = (key: string) => allFields("melee").find((f) => f.key === key)!;
  it("shows values in plain words", () => {
    expect(displayValue(field("timer"), 8)).toBe("8 min");
    expect(displayValue(field("wobbling"), false)).toBe("Banned");
    expect(displayValue(field("dsr"), "modified")).toMatch(/Modified DSR/);
    expect(displayValue(field("stocks"), undefined)).toBe("—");
  });
});
