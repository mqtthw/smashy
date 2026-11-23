// Account suspension for site admins (server-only). Uses Supabase Auth's ban: a suspended person can't
// sign in, Smashy's actions refuse them at once (they ask the sign-in service every time), and their
// session ends within the hour (its token isn't renewed). Until then the database refuses their writes. Their
// posts and profile stay as they are (remove those separately in Reports if needed). Who suspended them,
// when and why is kept on the account itself.
import "server-only";
import { createAdminClient } from "./supabase/admin";

const FOREVER = "876000h"; // ~100 years

export type AccountSummary = {
  id: string; tag: string; handle: string; createdAt: string;
  suspended: boolean; suspendedReason: string | null; suspendedAt: string | null;
};

async function summarize(id: string, tag: string, handle: string, createdAt: string): Promise<AccountSummary> {
  const { data } = await createAdminClient().auth.admin.getUserById(id);
  const u = data.user;
  const meta = (u?.app_metadata ?? {}) as { suspended_reason?: string; suspended_at?: string };
  const bannedUntil = (u as { banned_until?: string | null } | null)?.banned_until ?? null;
  const suspended = !!bannedUntil && Date.parse(bannedUntil) > Date.now();
  return { id, tag, handle, createdAt, suspended, suspendedReason: suspended ? meta.suspended_reason ?? null : null, suspendedAt: suspended ? meta.suspended_at ?? null : null };
}

export async function findAccount(handle: string): Promise<AccountSummary | null> {
  const h = handle.replace(/^@/, "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(h)) return null;
  const { data: p } = await createAdminClient().from("profiles").select("id, tag, handle, created_at").eq("handle", h).maybeSingle();
  return p ? summarize(p.id, p.tag, p.handle, p.created_at) : null;
}

/** Everyone currently suspended (checks up to the first 1,000 accounts). */
export async function listSuspended(): Promise<AccountSummary[]> {
  const db = createAdminClient();
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const ids = (data?.users ?? [])
    .filter((u) => {
      const until = (u as { banned_until?: string | null }).banned_until;
      return !!until && Date.parse(until) > Date.now();
    })
    .map((u) => u.id);
  if (!ids.length) return [];
  const { data: people } = await db.from("profiles").select("id, tag, handle, created_at").in("id", ids);
  return Promise.all((people ?? []).map((p) => summarize(p.id, p.tag, p.handle, p.created_at)));
}

export async function suspendAccount(id: string, reason: string, by: string) {
  const { error } = await createAdminClient().auth.admin.updateUserById(id, {
    ban_duration: FOREVER,
    app_metadata: { suspended_reason: reason.slice(0, 300), suspended_at: new Date().toISOString(), suspended_by: by },
  });
  if (error) throw error;
  await listAsSuspended(id, true);
}

/**
 * The database's own list of suspended accounts (round 768): its rules refuse writes from anyone on
 * it, so a suspended person's still-open session can't post straight to the database for the hour
 * its token lasts. The ban above is what suspends; a failure here is logged, not thrown.
 */
async function listAsSuspended(id: string, suspended: boolean) {
  const table = createAdminClient().from("suspended_accounts");
  const { error } = suspended ? await table.upsert({ user_id: id }, { onConflict: "user_id" }) : await table.delete().eq("user_id", id);
  if (error) console.error("Updating the suspended list failed", error.message);
}

export async function unsuspendAccount(id: string) {
  const { error } = await createAdminClient().auth.admin.updateUserById(id, {
    ban_duration: "none",
    app_metadata: { suspended_reason: null, suspended_at: null, suspended_by: null },
  });
  if (error) throw error;
  await listAsSuspended(id, false);
}

/** Free-plan limits, for the usage check. */
export const FREE_LIMITS = { databaseBytes: 500 * 1024 * 1024, storageBytes: 1024 * 1024 * 1024, visionPerMonth: 1000 };

/** Database and file storage size, plus photos checked this month (each costs one Vision check). */
export async function getUsage() {
  const db = createAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const since = monthStart.toISOString();
  const [{ data: usage }, postPhotos, messagePhotos, profiles] = await Promise.all([
    db.rpc("admin_usage"),
    db.from("post_images").select("path", { count: "exact", head: true }).gte("created_at", since),
    db.from("messages").select("id", { count: "exact", head: true }).not("image_path", "is", null).gte("created_at", since),
    db.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const u = (usage ?? { database_bytes: 0, buckets: {} }) as { database_bytes: number; buckets: Record<string, { files: number; bytes: number }> };
  const storageBytes = Object.values(u.buckets).reduce((n, b) => n + Number(b.bytes), 0);
  return {
    databaseBytes: Number(u.database_bytes),
    storageBytes,
    buckets: u.buckets,
    photosChecked: (postPhotos.count ?? 0) + (messagePhotos.count ?? 0),
    accounts: profiles.count ?? 0,
  };
}
