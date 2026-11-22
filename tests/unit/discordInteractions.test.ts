// The Discord bot's plain parts: Discord's signature check, reading commands, admin rights, link codes.
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canManageServer, commandOf, newCode, readCode, reply, verifyDiscord, type Interaction } from "@/lib/discordInteractions";

describe("Discord signature", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubHex = (publicKey.export({ format: "der", type: "spki" }) as Buffer).subarray(12).toString("hex");
  const signed = (ts: string, body: string) => sign(null, Buffer.from(ts + body), privateKey).toString("hex");

  it("accepts Discord's signature and nothing else", () => {
    const body = JSON.stringify({ type: 1 });
    const ts = "1794560000";
    expect(verifyDiscord(body, signed(ts, body), ts, pubHex)).toBe(true);
    expect(verifyDiscord(body + " ", signed(ts, body), ts, pubHex)).toBe(false); // body changed
    expect(verifyDiscord(body, signed(ts, body), "1794560001", pubHex)).toBe(false); // timestamp changed
    expect(verifyDiscord(body, null, ts, pubHex)).toBe(false);
    expect(verifyDiscord(body, signed(ts, body), ts, undefined)).toBe(false); // no key set up
    expect(verifyDiscord(body, "zz", ts, pubHex)).toBe(false);
  });
});

describe("Discord commands", () => {
  it("reads subcommands and their options", () => {
    const i: Interaction = { type: 2, data: { name: "smashy", options: [{ name: "connect", type: 1, options: [{ name: "code", type: 3, value: "ab12cd34" }] }] } };
    expect(commandOf(i)).toEqual({ path: ["smashy", "connect"], options: { code: "ab12cd34" } });
    expect(commandOf({ type: 2, data: { name: "bracket" } })).toEqual({ path: ["bracket"], options: {} });
  });

  it("knows who may change a server", () => {
    expect(canManageServer({ type: 2, member: { permissions: String(1 << 5) } })).toBe(true); // Manage Server
    expect(canManageServer({ type: 2, member: { permissions: "8" } })).toBe(true); // administrator
    expect(canManageServer({ type: 2, member: { permissions: "2048" } })).toBe(false); // send messages only
    expect(canManageServer({ type: 2, member: { permissions: "not a number" } })).toBe(false);
    expect(canManageServer({ type: 2 })).toBe(false);
  });

  it("makes and reads link codes", () => {
    const code = newCode(() => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 255]));
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(readCode(` ${code.toLowerCase().slice(0, 4)}-${code.slice(4)} `)).toBe(code);
    expect(readCode("short")).toBeNull();
    expect(readCode(undefined)).toBeNull();
  });

  it("replies without pinging anyone", () => {
    expect(reply("@everyone hi", true)).toEqual({ type: 4, data: { content: "@everyone hi", flags: 64, allowed_mentions: { parse: [] } } });
  });
});
