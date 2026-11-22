// Stream overlay: the sets coming up after the one on stream (a second browser source next to the
// score overlay). See-through; reloads itself every 10 seconds.
import { connection } from "next/server";
import { isLang } from "@/lib/i18n/core";
import { isUuid } from "@/lib/siteMeta";
import { upNextResponse } from "@/lib/streamOverlay";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const langParam = new URL(req.url).searchParams.get("lang");
  const lang = isLang(langParam) ? langParam : "en"; // the TO's language, from the link they copied
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  return upNextResponse(id, lang);
}
