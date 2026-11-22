"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/lib/actionErrors";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

/** Follow (or request to follow, for protected accounts: the database decides). */
export async function follow(profileId: string): Promise<ActionResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("follows").insert({ follower_id: userId, followee_id: profileId });
  if (error) return actionError(error);
  refresh();
  return {};
}

/** Unfollow, or cancel a pending request. */
export async function unfollow(profileId: string): Promise<ActionResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("followee_id", profileId);
  if (error) return actionError(error);
  refresh();
  return {};
}

export async function acceptFollowRequest(followerId: string) {
  const userId = await requireUser();
  const supabase = await createClient();
  await supabase.from("follows").update({ status: "active" }).eq("follower_id", followerId).eq("followee_id", userId).eq("status", "pending");
  refresh();
}

/** Decline a request, or remove an existing follower. */
export async function removeFollower(followerId: string) {
  const userId = await requireUser();
  const supabase = await createClient();
  await supabase.from("follows").delete().eq("follower_id", followerId).eq("followee_id", userId);
  refresh();
}
