// A tweet's card for a post (components/feed/TweetEmbed.tsx). Answers { tweet } (null when the tweet is
// gone); kept by browsers and Vercel's CDN for an hour.
import { NextResponse } from "next/server";
import { getTweetCard } from "@/lib/tweets";

export async function GET(_req: Request, ctx: RouteContext<"/api/tweet/[id]">) {
  const { id } = await ctx.params;
  if (!/^\d{5,25}$/.test(id)) return NextResponse.json({ tweet: null }, { status: 400 });
  try {
    const tweet = await getTweetCard(id);
    // A missing tweet is kept briefly (it may be a typo'd id, or the tweet may come back).
    const keep = tweet ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" : "public, max-age=300, s-maxage=300";
    return NextResponse.json({ tweet }, { headers: { "Cache-Control": keep } });
  } catch {
    return NextResponse.json({ tweet: null }, { status: 502 });
  }
}
