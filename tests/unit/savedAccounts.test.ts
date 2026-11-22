// Accounts saved on one device for switching (round 699).
import { describe, expect, it } from "vitest";
import { MAX_SAVED_ACCOUNTS, parseSavedAccounts, serializeSavedAccounts, withSavedAccount, withoutSavedAccount, type SavedAccount } from "@/lib/savedAccountsCodec";

const acct = (n: number, extra: Partial<SavedAccount> = {}): SavedAccount => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  refresh: `refresh${n}tokenxyz`,
  handle: `player${n}`,
  tag: `Player ${n}`,
  avatar: null,
  ...extra,
});

describe("saved accounts", () => {
  it("round-trips through the cookie", () => {
    const list = [acct(1), acct(2, { avatar: "u/abc.webp" })];
    expect(parseSavedAccounts(serializeSavedAccounts(list))).toEqual(list);
  });
  it("drops anything malformed or repeated, and keeps at most five", () => {
    const raw = Buffer.from(JSON.stringify([acct(1), { ...acct(2), id: "nope" }, { ...acct(3), refresh: "a b" }, acct(1), { ...acct(4), handle: "Bad Handle" }, 42])).toString("base64url");
    expect(parseSavedAccounts(raw).map((a) => a.handle)).toEqual(["player1"]);
    expect(parseSavedAccounts("not base64 json")).toEqual([]);
    expect(parseSavedAccounts(undefined)).toEqual([]);
    const many = Array.from({ length: 8 }, (_, i) => acct(i + 1));
    expect(parseSavedAccounts(serializeSavedAccounts(many))).toHaveLength(MAX_SAVED_ACCOUNTS);
  });
  it("puts a saved account first, replacing its older entry, and drops the oldest past five", () => {
    const list = [acct(1), acct(2), acct(3), acct(4), acct(5)];
    expect(withSavedAccount(list, acct(3, { refresh: "newtoken123" }))[0]).toMatchObject({ handle: "player3", refresh: "newtoken123" });
    expect(withSavedAccount(list, acct(3)).map((a) => a.handle)).toEqual(["player3", "player1", "player2", "player4", "player5"]);
    expect(withSavedAccount(list, acct(6)).map((a) => a.handle)).toEqual(["player6", "player1", "player2", "player3", "player4"]);
    expect(withoutSavedAccount(list, acct(2).id).map((a) => a.handle)).toEqual(["player1", "player3", "player4", "player5"]);
  });
});
