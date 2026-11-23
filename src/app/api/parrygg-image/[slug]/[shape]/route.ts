// A parry.gg tournament's picture, made small (round 725). parry.gg's banners can be huge animated
// GIFs (Blitz Box's is 19 MB) and its image server doesn't resize them, so Smashy showed no picture at
// all for parry.gg majors. This takes the first frame and saves it as a small still:
//   /api/parrygg-image/<slug>/banner   wide, for the top of the tournament's page
//   /api/parrygg-image/<slug>/square   a square crop, for the small picture on majors cards
// Kept by Vercel's network for a week, so the big file is fetched about once a week per picture.
import sharp from "sharp";
import { getParryggTournament } from "@/lib/brackets/parrygg";

const SHAPES = { banner: { width: 960, height: 540 }, square: { width: 176, height: 176 } } as const;
const MAX_BYTES = 40 * 1024 * 1024;
const KEEP = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const none = (status: number) => new Response(null, { status, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });

export async function GET(_request: Request, { params }: RouteContext<"/api/parrygg-image/[slug]/[shape]">) {
  const { slug, shape } = await params;
  if (shape !== "banner" && shape !== "square") return none(404);
  const t = await getParryggTournament(slug).catch(() => null);
  // The square prefers the organizer's own square picture; both fall back to the other one.
  const source = shape === "square" ? t?.avatarUrl ?? t?.bannerUrl : t?.bannerUrl ?? t?.avatarUrl;
  // Only parry.gg's own image host is ever fetched.
  if (!source || !source.startsWith("https://parrygg.b-cdn.net/")) return none(404);
  try {
    const res = await fetch(source, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return none(502);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return none(502);
    const original = Buffer.from(await res.arrayBuffer());
    if (original.byteLength > MAX_BYTES) return none(502);
    const size = SHAPES[shape];
    // First frame only (sharp's default for animations), cropped to the shape around its middle.
    const image = await sharp(original).resize(size.width, size.height, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
    return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/webp", "Cache-Control": KEEP } });
  } catch (e) {
    console.error("parry.gg picture failed", slug, e instanceof Error ? e.message : e);
    return none(502);
  }
}
