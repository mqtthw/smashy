"use server";

import { redirect } from "next/navigation";
import { cleanupEmptyConversations } from "@/lib/messages";
import { deleteAvatarFiles } from "@/lib/avatars";
import { cleanupPostImages } from "@/lib/postImages";
import { cleanupPostVideos } from "@/lib/postVideos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { revokeRefreshToken, signinKeyFromEnv } from "@/lib/appleSignIn";

export type DeleteState = { error?: string };

/**
 * Deletes the signed-in person's account and everything that's theirs: profile, posts, replies,
 * likes, follows, highlights, photos, shared clips, chats and messages (with their photos). Scenes and rulesets they started stay
 * (other people use them) without their name.
 */
export async function deleteMyAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const db = createAdminClient();
  const t = await getT();
  const { data: profile } = await db.from("profiles").select("handle").eq("id", userId).maybeSingle();
  const typed = String(formData.get("confirm") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (profile && typed !== profile.handle.toLowerCase()) return { error: t("people.delete.err.typeHandle", { handle: profile.handle }) };

  // Smashy always needs at least one site admin.
  const { data: admins } = await db.from("site_admins").select("user_id");
  if (admins?.some((a) => a.user_id === userId) && admins.length === 1) {
    return { error: t("people.delete.err.onlyAdmin") };
  }

  // Their message photos are private files: delete them before the messages go with the account.
  // A photo with an open report against it is kept until a moderator has dealt with the report
  // (deleting your account must not destroy the evidence); it's deleted then (admin/actions.ts).
  const { data: reported } = await db.from("live_reports").select("snapshot").eq("kind", "message").eq("author_id", userId).eq("status", "open");
  const keep = new Set((reported ?? []).map((r) => /\[photo:([^\]]+)\]/.exec((r.snapshot as string) ?? "")?.[1]).filter(Boolean) as string[]);
  // Read in pages: one request returns at most 1,000 rows.
  for (let from = 0; ; from += 1000) {
    const { data: photos } = await db.from("messages").select("image_path").eq("sender_id", userId).not("image_path", "is", null).order("id").range(from, from + 999);
    const paths = (photos ?? []).map((p) => p.image_path as string).filter((p) => !keep.has(p));
    if (paths.length) await db.storage.from("message-images").remove(paths);
    if ((photos ?? []).length < 1000) break;
  }

  await deleteAvatarFiles(userId);

  // Signed in with Apple: cancel Smashy's link with their Apple ID (Apple's rule 5.1.1(v)). A failure
  // is logged and the account is still deleted; the saved token goes with it.
  const appleKey = signinKeyFromEnv();
  if (appleKey) {
    const { data: apple } = await db.from("apple_signin_tokens").select("refresh_token").eq("user_id", userId).maybeSingle();
    if (apple?.refresh_token) await revokeRefreshToken(appleKey, apple.refresh_token as string).catch((e) => console.error("apple revoke failed", e instanceof Error ? e.message : e));
  }

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) {
    console.error("deleteMyAccount failed", error.message);
    return { error: t("people.delete.err.failed") };
  }
  // Only now clear the login cookie (this device; the account no longer exists anyway).
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  // Their posts are gone; delete the photo files too.
  await cleanupPostImages().catch((e) => console.error("Image cleanup after account delete failed", e));
  await cleanupPostVideos().catch((e) => console.error("Video cleanup after account delete failed", e));
  await cleanupEmptyConversations().catch((e) => console.error("Chat cleanup after account delete failed", e));
  redirect("/?account=deleted");
}
