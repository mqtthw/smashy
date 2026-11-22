// Smashy's own account (round 457): official events show as hosted by it, and the Smashy Discord
// server is linked to it. It signs in by email link (smashy.help@gmail.com, since 2026-11-15) to post;
// a site admin hosts events "as Smashy" and stays the real host.
import "server-only";
import { createAdminClient } from "./supabase/admin";
import { OFFICIAL_HANDLE } from "./officialHost";

export { OFFICIAL_HANDLE, OFFICIAL_HOST } from "./officialHost";

/** The official account's id (null if it's missing). */
export async function officialAccountId(): Promise<string | null> {
  const { data } = await createAdminClient().from("profiles").select("id").eq("handle", OFFICIAL_HANDLE).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
