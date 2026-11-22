import { describe, expect, it } from "vitest";
import { isReviewCode, isReviewEmail, reviewAccount } from "@/lib/reviewSignIn";

const env = { REVIEW_EMAIL: " Review@Example.com ", REVIEW_CODE: "0123456789" };

describe("the store reviewers' sign-in", () => {
  it("is off unless both settings are there and the code is exactly 10 digits", () => {
    expect(reviewAccount({})).toBeNull();
    expect(reviewAccount({ REVIEW_EMAIL: "a@b.co" })).toBeNull();
    expect(reviewAccount({ REVIEW_EMAIL: "a@b.co", REVIEW_CODE: "123456" })).toBeNull();
    expect(reviewAccount({ REVIEW_EMAIL: "a@b.co", REVIEW_CODE: "12345abcde" })).toBeNull();
    expect(reviewAccount(env)).toEqual({ email: "review@example.com", code: "0123456789" });
  });
  it("knows the review address in any capitals, and nobody else's", () => {
    expect(isReviewEmail("review@example.com", env)).toBe(true);
    expect(isReviewEmail("REVIEW@example.COM ", env)).toBe(true);
    expect(isReviewEmail("someone@example.com", env)).toBe(false);
    expect(isReviewEmail("review@example.com", {})).toBe(false);
  });
  it("accepts only the exact code", () => {
    expect(isReviewCode("0123456789", env)).toBe(true);
    expect(isReviewCode("01234 56789", env)).toBe(true);
    expect(isReviewCode("0123456788", env)).toBe(false);
    expect(isReviewCode("012345678", env)).toBe(false);
    expect(isReviewCode("", env)).toBe(false);
    expect(isReviewCode("0123456789", { REVIEW_EMAIL: "review@example.com" })).toBe(false);
  });
});
