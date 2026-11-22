// Browser errors (shown on the "Something went wrong" screen) are sent here and recorded in the error
// log. Accepts only small reports, at most a few per minute from one address.
import { logError } from "@/lib/errorLog";

const recent = new Map<string, number[]>();

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= 5) return new Response(null, { status: 429 });
  recent.set(ip, [...times, now]);
  if (recent.size > 5000) recent.clear();

  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== "string") return new Response(null, { status: 400 });
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 300) : null;
  await logError("browser", body.message.slice(0, 500), path, typeof body.digest === "string" ? body.digest.slice(0, 100) : null);
  return new Response(null, { status: 204 });
}
