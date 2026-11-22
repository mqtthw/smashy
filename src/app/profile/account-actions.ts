"use server";

// Switching between accounts on one device, like X (round 699). The account being left is saved (its sign-in
// refresh token, in an httpOnly cookie) so switching back needs no email link or code. Up to five.
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signinErrorPath } from "@/lib/authErrors";
import { safeReturnPath } from "@/lib/returnTo";
import { readSavedAccounts, writeSavedAccounts } from "@/lib/savedAccounts";
import { withSavedAccount, withoutSavedAccount, type SavedAccount } from "@/lib/savedAccountsCodec";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** The account signed in now, as a saved-list entry; null for guests and for half-finished sign-ups. */
async function currentAccount(supabase: Client): Promise<SavedAccount | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.refresh_token || !session.user?.id) return null;
  const { data: me } = await supabase.from("profiles").select("handle, tag, avatar_path").eq("id", session.user.id).maybeSingle();
  if (!me) return null;
  return { id: session.user.id, refresh: session.refresh_token, handle: me.handle as string, tag: me.tag as string, avatar: (me.avatar_path as string | null) ?? null };
}

/** Switch to a saved account; the one signed in now is saved in its place. */
export async function switchAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = safeReturnPath(formData.get("next")) ?? "/";
  const list = await readSavedAccounts();
  const target = list.find((a) => a.id === id);
  if (!target) redirect(next);
  const supabase = await createClient();
  const current = await currentAccount(supabase);
  if (current?.id === target.id) redirect(next);
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: target.refresh });
  if (error || !data.session || data.session.user.id !== target.id) {
    // Signed out elsewhere, or the saved sign-in ran out: forget it and ask for a fresh sign-in.
    await writeSavedAccounts(withoutSavedAccount(list, target.id));
    refresh();
    redirect(signinErrorPath("again"));
  }
  let saved = withoutSavedAccount(list, target.id);
  if (current) saved = withSavedAccount(saved, current);
  await writeSavedAccounts(saved);
  refresh();
  redirect(next);
}

/** Add another account: this one is saved, then sign-in opens for the new one. */
export async function addAccount() {
  const supabase = await createClient();
  const current = await currentAccount(supabase);
  if (current) await writeSavedAccounts(withSavedAccount(await readSavedAccounts(), current));
  // Not supabase.auth.signOut(): even its "local" scope ends the session on Supabase's side, which would kill
  // the saved token. Only this browser's sign-in cookies are cleared, so switching back keeps working.
  const jar = await cookies();
  for (const c of jar.getAll()) if (/^sb-.+-auth-token(\.\d+)?$/.test(c.name)) jar.delete(c.name);
  refresh();
  redirect("/signin");
}

/** Forget a saved account on this device. */
export async function forgetSavedAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await writeSavedAccounts(withoutSavedAccount(await readSavedAccounts(), id));
  refresh();
  redirect(safeReturnPath(formData.get("next")) ?? "/profile#accounts");
}
