// Reading and writing the saved-accounts cookie (round 699; the list itself: savedAccountsCodec.ts).
import "server-only";
import { cookies } from "next/headers";
import { parseSavedAccounts, serializeSavedAccounts, type SavedAccount } from "./savedAccountsCodec";

export const SAVED_ACCOUNTS_COOKIE = "smashy-accounts";

/** The accounts saved on this device (not including the one signed in now). */
export async function readSavedAccounts(): Promise<SavedAccount[]> {
  return parseSavedAccounts((await cookies()).get(SAVED_ACCOUNTS_COOKIE)?.value);
}

/** Saves the list (from a Server Action). httpOnly: the page's scripts can't read the sign-in tokens. */
export async function writeSavedAccounts(list: SavedAccount[]): Promise<void> {
  const jar = await cookies();
  if (!list.length) {
    jar.delete(SAVED_ACCOUNTS_COOKIE);
    return;
  }
  jar.set(SAVED_ACCOUNTS_COOKIE, serializeSavedAccounts(list), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}
