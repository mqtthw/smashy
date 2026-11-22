// Stream overlay for one hosted set. For one overlay that follows the whole event, see /host/[id]/overlay.
import { connection } from "next/server";
import { isLang } from "@/lib/i18n/core";
import type { LiveState } from "@/lib/liveSet";
import { overlayResponse } from "@/lib/streamOverlay";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const langParam = new URL(req.url).searchParams.get("lang");
  const lang = isLang(langParam) ? langParam : "en"; // the TO's language, from the link they copied
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const { data: row } = await (await createClient()).from("hosted_sets").select("event_id, live").eq("id", id).maybeSingle();
  if (!row) return new Response("Not found", { status: 404 });
  return overlayResponse(row.event_id as string, id, (row.live as LiveState | null) ?? null, lang);
}
