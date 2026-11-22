// The list of accounts saved on this device for switching, like X (round 699). Kept in an httpOnly cookie:
// for each account its id, the sign-in refresh token, and the name and picture to show. Plain logic only
// (no server imports) so tests can use it; src/lib/savedAccounts.ts reads and writes the cookie.

export const MAX_SAVED_ACCOUNTS = 5;

export type SavedAccount = { id: string; refresh: string; handle: string; tag: string; avatar: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REFRESH = /^[A-Za-z0-9_-]{6,200}$/;
const HANDLE = /^[a-z0-9_]{1,30}$/;

function valid(a: unknown): a is SavedAccount {
  if (!a || typeof a !== "object") return false;
  const x = a as Record<string, unknown>;
  return (
    typeof x.id === "string" && UUID.test(x.id) &&
    typeof x.refresh === "string" && REFRESH.test(x.refresh) &&
    typeof x.handle === "string" && HANDLE.test(x.handle) &&
    typeof x.tag === "string" && x.tag.length >= 1 && x.tag.length <= 40 &&
    (x.avatar === null || (typeof x.avatar === "string" && x.avatar.length <= 300))
  );
}

/** The cookie's value as a list: anything malformed is dropped, one entry per account, at most five. */
export function parseSavedAccounts(raw: string | undefined | null): SavedAccount[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: SavedAccount[] = [];
  for (const a of data) {
    if (!valid(a) || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push({ id: a.id, refresh: a.refresh, handle: a.handle, tag: a.tag, avatar: a.avatar });
    if (out.length === MAX_SAVED_ACCOUNTS) break;
  }
  return out;
}

export function serializeSavedAccounts(list: SavedAccount[]): string {
  return Buffer.from(JSON.stringify(list.slice(0, MAX_SAVED_ACCOUNTS)), "utf8").toString("base64url");
}

/** The list with this account first (replacing an older entry for it); the oldest falls off past five. */
export function withSavedAccount(list: SavedAccount[], account: SavedAccount): SavedAccount[] {
  return [account, ...list.filter((a) => a.id !== account.id)].slice(0, MAX_SAVED_ACCOUNTS);
}

export function withoutSavedAccount(list: SavedAccount[], id: string): SavedAccount[] {
  return list.filter((a) => a.id !== id);
}
