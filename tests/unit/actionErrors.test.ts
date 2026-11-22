import { describe, expect, it } from "vitest";
import { actionError, GENERIC_ACTION_ERROR, GONE_ERROR } from "@/lib/actionErrors";

describe("actionError", () => {
  it("is quiet when nothing went wrong or it was already done", () => {
    expect(actionError(null)).toEqual({});
    expect(actionError({ code: "23505", message: "duplicate key" })).toEqual({});
  });
  it("passes on the database's own messages for people", () => {
    const tooFast = "You're doing that too fast. Wait a few minutes and try again.";
    expect(actionError({ code: "P0429", message: tooFast })).toEqual({ error: tooFast });
    expect(actionError({ code: "P0001", message: "Join that scene to use its emojis." })).toEqual({ error: "Join that scene to use its emojis." });
  });
  it("says when the thing was deleted meanwhile", () => {
    expect(actionError({ code: "23503", message: 'insert or update on table "post_likes" violates foreign key constraint' })).toEqual({ error: GONE_ERROR });
  });
  it("hides technical errors behind a plain message", () => {
    const quiet = console.error;
    console.error = () => {};
    expect(actionError({ code: "42501", message: "permission denied for table post_likes" })).toEqual({ error: GENERIC_ACTION_ERROR });
    console.error = quiet;
  });
});
