// Icons for "Add to Home Screen" (see app/manifest.ts): 192 and 512 px, plus "maskable" versions
// with a smaller S and more room around it, because Android crops home-screen icons into circles and squircles.
import { renderIcon } from "@/lib/iconArt";

const VARIANTS: Record<string, { size: number; maskable: boolean }> = {
  "192.png": { size: 192, maskable: false },
  "512.png": { size: 512, maskable: false },
  "maskable-192.png": { size: 192, maskable: true },
  "maskable-512.png": { size: 512, maskable: true },
};

export async function GET(_req: Request, ctx: RouteContext<"/app-icon/[variant]">) {
  const { variant } = await ctx.params;
  const v = VARIANTS[variant];
  if (!v) return new Response("Not found", { status: 404 });
  const res = await renderIcon(v.size, false, v.maskable);
  res.headers.set("Cache-Control", "public, max-age=86400, immutable");
  return res;
}

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}
