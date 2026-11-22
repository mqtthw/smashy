// Discord sends every slash command here (the app's "Interactions Endpoint URL"). Each request is checked
// against Discord's signature first; anything unsigned is refused. Answers come back in the same request,
// except /next, which may need start.gg: Discord is told "thinking…" and the answer follows.
import { after } from "next/server";
import { answer, nextSetText, sendFollowup } from "@/lib/discordBot";
import { commandOf, deferred, verifyDiscord, type Interaction } from "@/lib/discordInteractions";

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 100_000) return new Response("Too big", { status: 413 });
  // The key as pasted into the settings, forgiving stray spaces or quotes around it.
  const key = process.env.DISCORD_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, "");
  const ok = verifyDiscord(body, request.headers.get("x-signature-ed25519"), request.headers.get("x-signature-timestamp"), key);
  if (!ok) {
    // Discord sends one badly signed request on purpose when the endpoint is saved; this shows whether others fail too.
    console.warn(`discord interactions: refused (signature ${request.headers.get("x-signature-ed25519") ? "present" : "missing"}, key ${key ? `${key.length} chars` : "not set"})`);
    return new Response("Bad signature", { status: 401 });
  }
  let i: Interaction;
  try {
    i = JSON.parse(body) as Interaction;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (i.type === 1) {
    console.log("discord interactions: ping answered"); // Discord checking the endpoint
    return Response.json({ type: 1 });
  }
  if (i.type !== 2) return Response.json({ type: 4, data: { content: "…", flags: 64 } });
  if (commandOf(i).path[0] === "next") {
    after(async () => sendFollowup(i, await nextSetText(i)));
    return Response.json(deferred(true));
  }
  return Response.json(await answer(i));
}
