// Processes a video the browser just uploaded for a post (see lib/postVideos.ts). A route rather than
// a server action so it can have its own time limit: re-saving a minute of phone video can take a
// while. Answers { video } or { error } (already in the visitor's language).
import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { finishVideoUpload } from "@/lib/postVideos";
import { getVerifiedUserId } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  // Only Smashy's own pages may call this (a server action gets the same check from Next.js).
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const userId = await getVerifiedUserId();
  const t = await getT();
  if (!userId) return NextResponse.json({ error: t("feed.video.signIn") }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: t("feed.video.expired") }, { status: 400 });

  const res = await finishVideoUpload(userId, id);
  if ("error" in res) return NextResponse.json({ error: t(res.error, res.values) }, { status: 422 });
  return NextResponse.json({ video: res });
}
