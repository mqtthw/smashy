import { describe, expect, it } from "vitest";
import { isTabActive } from "@/lib/navActive";

describe("isTabActive", () => {
  it("lights the feed only on the home page", () => {
    expect(isTabActive("/", "/")).toBe(true);
    expect(isTabActive("/events", "/")).toBe(false);
  });
  it("lights a tab on its own page and the pages under it", () => {
    expect(isTabActive("/play", "/play")).toBe(true);
    expect(isTabActive("/play/lobby/1", "/play")).toBe(true);
    expect(isTabActive("/events/genesis-x4", "/events")).toBe(true);
  });
  it("doesn't light a tab for a path that only shares its first letters", () => {
    expect(isTabActive("/players/16105", "/play")).toBe(false);
    expect(isTabActive("/players/compare", "/play")).toBe(false);
  });
  it("lights nothing before the address is known", () => {
    expect(isTabActive(null, "/play")).toBe(false);
  });
});
