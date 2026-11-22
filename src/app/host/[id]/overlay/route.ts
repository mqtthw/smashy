// Stream overlay that follows a hosted event: the deepest set being played (else the next one up),
// so a streamer adds one browser source and never changes it between sets.
import { connection } from "next/server";
import { isLang } from "@/lib/i18n/core";
import { isUuid } from "@/lib/siteMeta";
import { overlayResponse } from "@/lib/streamOverlay";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const langParam = new URL(req.url).searchParams.get("lang");
  const lang = isLang(langParam) ? langParam : "en"; // the TO's language, from the link they copied
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  return overlayResponse(id, null, undefined, lang);
}
