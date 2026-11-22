// The public API's front door (round 708): what's here and where the docs are. See lib/publicApi.ts.
import { apiJson } from "@/lib/publicApi";
import { siteUrl } from "@/lib/siteMeta";

export function GET() {
  const at = (path: string) => new URL(path, siteUrl()).toString();
  return apiJson(
    {
      name: "Smashy public API",
      version: "v1",
      docs: at("/developers"),
      note: "Read-only, no key needed. Shows only what a signed-out visitor can see on smashy.gg.",
      endpoints: {
        games: at("/api/v1/games"),
        regions: at("/api/v1/regions"),
        events: at("/api/v1/events?region=US-TX&game=melee"),
        event: at("/api/v1/events/{slug}"),
        brackets: at("/api/v1/brackets?game=melee"),
        bracket: at("/api/v1/brackets/{id}"),
        bracketResults: at("/api/v1/brackets/{id}/results"),
        majors: at("/api/v1/majors?year=2025&game=melee"),
        upcomingMajors: at("/api/v1/majors/upcoming"),
        major: at("/api/v1/majors/{slug}"),
        headToHead: at("/api/v1/head-to-head?year=2025&game=melee"),
        rulesets: at("/api/v1/rulesets?game=melee"),
        ruleset: at("/api/v1/rulesets/{id}"),
      },
    },
    "long",
  );
}
