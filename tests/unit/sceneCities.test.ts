import { describe, expect, it } from "vitest";
import { MAX_CITIES, MAX_CITY_LENGTH, parseSceneCities } from "@/lib/sceneCities";

describe("parseSceneCities", () => {
  it("splits on commas and trims", () => {
    expect(parseSceneCities(" San Antonio ,New Braunfels,, ")).toEqual(["San Antonio", "New Braunfels"]);
  });

  it("cuts a very long name", () => {
    const [city] = parseSceneCities("x".repeat(5000));
    expect(city).toHaveLength(MAX_CITY_LENGTH);
  });

  it("collapses inner spaces and drops repeats, ignoring case", () => {
    expect(parseSceneCities("San   Antonio, san antonio, Austin")).toEqual(["San Antonio", "Austin"]);
  });

  it("keeps at most MAX_CITIES", () => {
    const raw = Array.from({ length: 30 }, (_, i) => `City ${i}`).join(",");
    expect(parseSceneCities(raw)).toHaveLength(MAX_CITIES);
  });

  it("returns nothing for an empty box", () => {
    expect(parseSceneCities(" , ,")).toEqual([]);
  });
});
