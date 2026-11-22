// Private beta invite codes (server-only). Site admins make codes; new people enter one on the
// Welcome page (or open a /signin?invite=CODE link, which fills it in).
import "server-only";
import { randomInt } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { createAdminClient } from "./supabase/admin";

export const INVITE_COOKIE = "smashy-invite";

export type InviteCode = { code: string; note: string | null; maxUses: number; uses: number; disabled: boolean; createdAt: string; joined?: string[] };

/** Easy-to-read codes like SMASH-7KQ2: no 0/O or 1/I mix-ups. */
export function newInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `SMASH-${Array.from({ length: 5 }, () => chars[randomInt(chars.length)]).join("")}`;
}

/** The cache tag for the invite-only switch (cleared when an admin flips it). */
export const INVITE_ONLY_TAG = "invite-only";

/**
 * Whether sign-up needs an invite. One copy shared by every server (round 571): the guest Feed,
 * sign-in and Profile read it from the database on every visit, and it almost never changes. Flipping
 * it in Admin clears the copy (toggleInviteOnly).
 */
export async function isInviteOnly(): Promise<boolean> {
  "use cache: remote";
  cacheTag(INVITE_ONLY_TAG);
  const { data, error } = await createAdminClient().from("app_settings").select("invite_only").eq("id", 1).maybeSingle();
  // A failed read counts as invite-only (as before), but only for seconds, not hours.
  if (error) cacheLife("seconds");
  else cacheLife("hours");
  return data?.invite_only ?? true;
}

/** Call from a server action, then updateTag(INVITE_ONLY_TAG) so every server sees the change at once. */
export async function setInviteOnly(on: boolean) {
  await createAdminClient().from("app_settings").update({ invite_only: on }).eq("id", 1);
}

export async function listInviteCodes(): Promise<InviteCode[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("invite_codes").select("code, note, max_uses, uses, disabled, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  const joined = await whoJoined((data ?? []).map((c) => c.code));
  return (data ?? []).map((c) => ({ code: c.code, note: c.note, maxUses: c.max_uses, uses: c.uses, disabled: c.disabled, createdAt: c.created_at, joined: joined.get(c.code) ?? [] }));
}

/** Who joined with each code (their @handles). */
async function whoJoined(codes: string[]): Promise<Map<string, string[]>> {
  const db = createAdminClient();
  const { data: used } = codes.length ? await db.from("invite_redemptions").select("code, user_id").in("code", codes) : { data: [] };
  const ids = [...new Set((used ?? []).map((u) => u.user_id))];
  const { data: people } = ids.length ? await db.from("profiles").select("id, handle").in("id", ids) : { data: [] };
  const handleOf = new Map((people ?? []).map((p) => [p.id, p.handle as string]));
  const joined = new Map<string, string[]>();
  for (const u of used ?? []) {
    const h = handleOf.get(u.user_id);
    if (h && u.code) joined.set(u.code, [...(joined.get(u.code) ?? []), h]);
  }
  return joined;
}

export async function createInviteCode(createdBy: string, maxUses: number, note: string | null): Promise<string> {
  const db = createAdminClient();
  for (let tries = 0; tries < 5; tries++) {
    const code = newInviteCode();
    const { error } = await db.from("invite_codes").insert({ code, max_uses: Math.min(500, Math.max(1, Math.floor(maxUses) || 1)), note: note?.slice(0, 80) || null, created_by: createdBy });
    if (!error) return code;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Couldn't make a unique code");
}

export async function setInviteDisabled(code: string, disabled: boolean) {
  await createAdminClient().from("invite_codes").update({ disabled }).eq("code", code);
}

export const MEMBER_INVITES = 3; // single-use codes each member can make during the beta

/** Codes this member made (newest first). */
export async function listMyInvites(userId: string): Promise<InviteCode[]> {
  const { data } = await createAdminClient().from("invite_codes").select("code, note, max_uses, uses, disabled, created_at").eq("created_by", userId).order("created_at", { ascending: false }).limit(20);
  const joined = await whoJoined((data ?? []).map((c) => c.code));
  return (data ?? []).map((c) => ({ code: c.code, note: c.note, maxUses: c.max_uses, uses: c.uses, disabled: c.disabled, createdAt: c.created_at, joined: joined.get(c.code) ?? [] }));
}

/** A member makes one single-use invite, if they have any left. A string is a message for them. */
export async function createMemberInvite(userId: string): Promise<{ code: string } | string> {
  const db = createAdminClient();
  const { count } = await db.from("invite_codes").select("code", { count: "exact", head: true }).eq("created_by", userId);
  if ((count ?? 0) >= MEMBER_INVITES) return `You've made all ${MEMBER_INVITES} of your invites.`;
  const { data: me } = await db.from("profiles").select("handle").eq("id", userId).maybeSingle();
  const code = await createInviteCode(userId, 1, me ? `From @${me.handle}` : null);
  // Two tabs at the same moment can both pass the check above. Keep only the first few codes (oldest
  // first, ties broken by code) and take this one back if it's past the limit.
  const { data: mine } = await db.from("invite_codes").select("code").eq("created_by", userId).order("created_at").order("code").limit(MEMBER_INVITES + 5);
  const allowed = (mine ?? []).slice(0, MEMBER_INVITES).map((c) => c.code);
  if (!allowed.includes(code)) {
    await db.from("invite_codes").delete().eq("code", code).eq("uses", 0);
    return `You've made all ${MEMBER_INVITES} of your invites.`;
  }
  return { code };
}
