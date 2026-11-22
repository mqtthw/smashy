import { describe, expect, it } from "vitest";
import { cleanTag, handleProblem, suggestHandle, tagProblem } from "@/lib/handles";

describe("handles", () => {
  it("accepts ordinary handles and suggests one from a tag", () => {
    expect(handleProblem("mang0")).toBeNull();
    expect(handleProblem("the_moderate_fox")).toBeNull();
    expect(suggestHandle("Mang0 ✨")).toBe("mang0");
  });
  it("refuses bad shapes, reserved names and staff look-alikes", () => {
    expect(handleProblem("ab")).toMatch(/3–20/);
    expect(handleProblem("Admin")).toMatch(/3–20/); // uppercase isn't allowed at all
    expect(handleProblem("admin")).toMatch(/reserved/);
    for (const h of ["smashy_support", "smashyhq", "the_admin", "mod_team", "official_staff"]) expect(handleProblem(h)).toMatch(/staff/);
  });
  it("lets site admins use staff-like handles", () => {
    expect(handleProblem("smashyhq", { staff: true })).toBeNull();
  });
});

describe("tags", () => {
  it("cleans invisible and control characters, keeping combined emoji", () => {
    expect(cleanTag("  Mang0​  ")).toBe("Mang0");
    expect(cleanTag("A\u0000B\tC")).toBe("AB C");
    expect(cleanTag("ｆｏｘ")).toBe("fox"); // full-width letters become ordinary ones
    expect(cleanTag("​ㅤ⠀")).toBe("");
    expect(cleanTag("👩‍💻 dev")).toBe("👩‍💻 dev");
  });
  it("accepts ordinary tags, including emoji-only ones", () => {
    for (const t of ["Mang0", "Cody Schwab", "C9.Mang0", "🔥", "Moderate Fox", "Staffordshire", "Support Main"]) expect(tagProblem(cleanTag(t))).toBeNull();
  });
  it("refuses blank, too-long and staff-like tags", () => {
    expect(tagProblem(cleanTag("​‍"))).not.toBeNull();
    expect(tagProblem("x".repeat(31))).toMatch(/1–30/);
    for (const t of ["Smashy Safety Team", "smashy", "Admin", "The Moderator", "Staff", "Official Team", "Support Team"]) expect(tagProblem(t)).toMatch(/staff/);
    expect(tagProblem("Smashy", { staff: true })).toBeNull();
  });
});
