// The plain parts of the Discord bot (docs/discord-bot-plan.md): checking that a request really comes from
// Discord, reading a command, and the answers' shapes. No database or network here, so it can be tested.
import { createPublicKey, verify } from "node:crypto";

/** Discord signs every request: Ed25519 over the timestamp header followed by the raw body. */
export function verifyDiscord(body: string, signature: string | null, timestamp: string | null, publicKeyHex: string | undefined): boolean {
  if (!publicKeyHex || !signature || !timestamp) return false;
  if (!/^[0-9a-f]{64}$/i.test(publicKeyHex) || !/^[0-9a-f]{128}$/i.test(signature) || !/^\d{1,15}$/.test(timestamp)) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKeyHex, "hex")]), format: "der", type: "spki" });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export type Option = { name: string; type: number; value?: string | number | boolean; options?: Option[] };
export type Interaction = {
  type: number; // 1 ping, 2 command
  token?: string;
  application_id?: string;
  guild_id?: string;
  locale?: string;
  data?: { name?: string; options?: Option[] };
  member?: { user?: { id?: string }; permissions?: string };
  user?: { id?: string };
};

/** "smashy connect" → ["smashy", "connect"], with the options of the deepest level. */
export function commandOf(i: Interaction): { path: string[]; options: Record<string, string> } {
  const path = [String(i.data?.name ?? "")];
  let opts = i.data?.options ?? [];
  while (opts.length === 1 && (opts[0].type === 1 || opts[0].type === 2) && path.length < 3) {
    path.push(opts[0].name);
    opts = opts[0].options ?? [];
  }
  const options: Record<string, string> = {};
  for (const o of opts) if (o.value !== undefined) options[o.name] = String(o.value);
  return { path, options };
}

/** Who typed the command (in a server, or in a direct message). */
export const userIdOf = (i: Interaction): string | null => i.member?.user?.id ?? i.user?.id ?? null;

const ADMINISTRATOR = BigInt(1) << BigInt(3);
const MANAGE_GUILD = BigInt(1) << BigInt(5);

/** Whether the person may change the server's settings (Discord's "Manage Server", or an administrator). */
export function canManageServer(i: Interaction): boolean {
  try {
    const p = BigInt(i.member?.permissions ?? "0");
    return (p & ADMINISTRATOR) !== BigInt(0) || (p & MANAGE_GUILD) !== BigInt(0);
  } catch {
    return false;
  }
}

/** A reply: never pings anyone; `secret` = only the person who asked sees it. */
export const reply = (content: string, secret = false) => ({
  type: 4,
  data: { content: content.slice(0, 1990), flags: secret ? 64 : 0, allowed_mentions: { parse: [] as string[] } },
});

/** "Thinking…" while a slow answer is worked out (sent later as the original message). */
export const deferred = (secret = false) => ({ type: 5, data: { flags: secret ? 64 : 0 } });

/** A link code as typed (spaces and capitals forgiven). */
export const readCode = (raw: string | undefined): string | null => {
  const code = String(raw ?? "").replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{6,10}$/.test(code) ? code : null;
};

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

/** A new link code (8 characters, easy to read and type). */
export function newCode(random: (n: number) => Uint8Array): string {
  return [...random(8)].map((b) => CODE_LETTERS[b % CODE_LETTERS.length]).join("");
}
