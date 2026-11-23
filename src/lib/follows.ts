// Follows (server-side, as the current viewer: protected accounts' lists stay private).
import { createClient } from "./supabase/server";

export type FollowState = "none" | "pending" | "active";
export type PersonRow = { id: string; tag: string; handle: string; bio: string | null; avatar_path?: string | null; mains?: unknown };

export async function getFollowState(viewerId: string | null, profileId: string): Promise<FollowState> {
  if (!viewerId || viewerId === profileId) return "none";
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("status").eq("follower_id", viewerId).eq("followee_id", profileId).maybeSingle().throwOnError();
  return (data?.status as FollowState | undefined) ?? "none";
}

/** Active follower/following counts. For protected accounts, only the owner gets real numbers. */
export async function getFollowCounts(profileId: string) {
  const supabase = await createClient();
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", profileId).eq("status", "active"),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId).eq("status", "active"),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function getFollowList(profileId: string, kind: "followers" | "following"): Promise<PersonRow[]> {
  const supabase = await createClient();
  const mine = kind === "followers" ? "followee_id" : "follower_id";
  const theirs = kind === "followers" ? "follower_id" : "followee_id";
  const { data } = await supabase.from("follows").select(theirs).eq(mine, profileId).eq("status", "active").order("created_at", { ascending: false }).limit(500).throwOnError();
  const ids = (data ?? []).map((r) => (r as Record<string, string>)[theirs]);
  if (!ids.length) return [];
  const { data: people } = await supabase.from("profiles").select("id, tag, handle, bio, avatar_path, mains").in("id", ids).throwOnError();
  const byId = new Map((people ?? []).map((p) => [p.id, p as PersonRow]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

/** Accounts the user follows (active only), for the Following feed. */
export async function getFollowedIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", userId).eq("status", "active").limit(2000).throwOnError();
  return (data ?? []).map((r) => r.followee_id);
}

/** Does the user follow at least `n` people? Reads at most `n` rows, not the whole list (round 742). */
export async function followsAtLeast(userId: string, n: number): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", userId).eq("status", "active").limit(n).throwOnError();
  return (data ?? []).length >= n;
}

/** People waiting for the user to accept their follow request. */
export async function getFollowRequests(userId: string): Promise<PersonRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("follower_id").eq("followee_id", userId).eq("status", "pending").order("created_at", { ascending: false }).throwOnError();
  const ids = (data ?? []).map((r) => r.follower_id);
  if (!ids.length) return [];
  const { data: people } = await supabase.from("profiles").select("id, tag, handle, bio").in("id", ids).throwOnError();
  return (people ?? []) as PersonRow[];
}
