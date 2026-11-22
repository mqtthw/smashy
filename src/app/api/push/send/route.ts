// The database calls this (through pg_net) when a notification or direct message arrives. It only
// sends an id plus a shared secret; everything else is looked up here with the server key.
import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { pushMessage, pushNotification } from "@/lib/push";

function secretOk(given: string | null): boolean {
  const expected = process.env.PUSH_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-push-secret"))) return new Response(null, { status: 401 });
  const body = (await request.json().catch(() => null)) as { kind?: unknown; id?: unknown } | null;
  const id = typeof body?.id === "string" && UUID.test(body.id) ? body.id : null;
  if (!id || (body?.kind !== "notification" && body?.kind !== "message")) return new Response(null, { status: 400 });
  // Answer the database right away; send in the background.
  after(async () => {
    try {
      await (body.kind === "message" ? pushMessage(id) : pushNotification(id));
    } catch (e) {
      console.error("push send failed", (e as Error).message);
    }
  });
  return new Response(null, { status: 202 });
}
