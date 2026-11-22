import { describe, expect, it } from "vitest";
import { postErrorMessage } from "@/lib/postErrors";

describe("postErrorMessage", () => {
  it("passes on the safety and rate-limit messages, hides everything else", () => {
    expect(postErrorMessage("Sharing or asking for contact info isn't allowed here.")).toMatch(/contact info/);
    expect(postErrorMessage("You're posting too fast. Wait a minute and try again.")).toMatch(/too fast/);
    const newAccount = "New accounts can post 10 times an hour in their first week. Try again in a bit.";
    expect(postErrorMessage(newAccount)).toBe(newAccount);
    expect(postErrorMessage('duplicate key value violates unique constraint "x"')).toBe("Couldn't post that. Please try again.");
  });
  it("passes on the database's own rule messages (by their code), and words a missing post plainly", () => {
    expect(postErrorMessage("That reply isn't available.", "P0001")).toBe("That reply isn't available.");
    expect(postErrorMessage("Replies can't have replies", "P0001")).toBe("Replies can't have replies");
    expect(postErrorMessage("Post not found", "P0001")).toBe("That post isn't available anymore.");
    // The same words without a rule code (an unexpected failure) stay hidden.
    expect(postErrorMessage("relation does not exist", "42P01")).toBe("Couldn't post that. Please try again.");
  });
});
