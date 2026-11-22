// The ways into an account, for "How you sign in" on the profile (round 684).

export const SIGNIN_METHOD_NAMES: Record<string, string> = { email: "Email", google: "Google", discord: "Discord", apple: "Apple" };

/** The providers on an account, email first, without repeats. An account with an email address can always
 * get a sign-in link or code at it, whichever way it joined. */
export function signInProviders(identities: { provider: string }[] | null | undefined, email: string | null | undefined): string[] {
  const set = new Set((identities ?? []).map((i) => i.provider));
  if (email) set.add("email");
  return ["email", "google", "discord", "apple"].filter((p) => set.has(p));
}
