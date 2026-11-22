"use server";
// "Connect a Discord server": a member makes a short-lived code to type in their server with
// /smashy connect, and can unlink servers linked to them. The tables are server-only.
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newCode } from "@/lib/discordInteractions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/supabase/server";

export async function makeDiscordCode(): Promise<{ code?: string; error?: boolean }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin?next=/host/discord");
  const db = createAdminClient();
  await db.from("discord_link_codes").delete().eq("host_id", userId); // one code at a time
  const code = newCode((n) => randomBytes(n));
  const { error } = await db.from("discord_link_codes").insert({ code, host_id: userId, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() });
  return error ? { error: true } : { code };
}

export async function unlinkDiscordServer(formData: FormData) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin?next=/host/discord");
  const guild = String(formData.get("guild") ?? "");
  if (/^\d{5,25}$/.test(guild)) await createAdminClient().from("discord_servers").delete().eq("guild_id", guild).eq("host_id", userId);
  revalidatePath("/host/discord");
}
