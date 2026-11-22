// The regions Smashy lists events for, with the codes the events endpoint takes (round 708).
import { apiJson } from "@/lib/publicApi";
import { REGIONS } from "@/lib/regions";

export function GET() {
  return apiJson({ regions: REGIONS.map((r) => ({ code: r.code, name: r.name, group: r.group })) }, "long");
}
