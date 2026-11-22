"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/supabase/server";

/**
 * Mark everything read (called when the notifications page is opened). Includes types you've
 * switched off: the database hides those from you, so marking them as you would skip them, and
 * they'd all come back as unread if you switched the type on again. Only ever your own rows.
 */
export async function markAllRead() {
  const userId = await getVerifiedUserId();
  if (!userId) return;
  await createAdminClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
