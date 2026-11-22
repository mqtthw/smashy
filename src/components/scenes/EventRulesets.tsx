import Link from "next/link";
import { detachRuleset } from "@/app/scenes/actions";
import GameBadge from "@/components/GameBadge";
import type { GameKey } from "@/lib/games";
import { allFields, displayValue } from "@/lib/rulesetFields";
import { getAttachedRulesets, getMyAdminRulesets, type Attachment } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import AttachRulesetForm from "./AttachRulesetForm";
import { getT } from "@/lib/i18n/server";

const HIGHLIGHTS = ["stocks", "timer", "best_of", "starters"];

/** "Ruleset" section on event pages: what's attached, plus attach/detach controls for scene admins. */
export default async function EventRulesets({
  games,
  tournamentSlug,
  seriesId,
  seriesName,
  attached: started,
}: {
  games: GameKey[];
  tournamentSlug?: string;
  seriesId?: string | null;
  seriesName?: string;
  /** The attached rulesets, when the page already started loading them (round 708: the event page starts them alongside its other lookups). */
  attached?: Promise<Attachment[]>;
}) {
  const userId = await getUserId();
  const [attached, mine, t] = await Promise.all([
    started ?? getAttachedRulesets({ tournamentSlug, seriesId: seriesId ?? undefined }),
    getMyAdminRulesets(userId),
    getT(),
  ]);
  // "from the {scene} scene", split around the scene's link.
  const [fromBefore, fromAfter = ""] = t("media.rs.fromScene").split("{scene}");
  const myIds = new Set(mine.map((r) => r.id));
  const options = mine.filter((r) => games.includes(r.game)).map((r) => ({ id: r.id, name: r.name, game: r.game }));

  return (
    <section className="flex flex-col gap-3 card p-4">
      <h2 className="font-bold">{t("media.rs.heading")}</h2>
      {attached.length === 0 && (
        <p className="text-sm text-muted">{t("media.rs.noneAttached")}</p>
      )}
      {attached.map((a) => {
        const v = a.ruleset.latest;
        const fields = allFields(a.game).filter((f) => HIGHLIGHTS.includes(f.key));
        return (
          <div key={a.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <GameBadge game={a.game} />
              <Link href={`/rulesets/${a.ruleset.id}`} className="font-semibold text-brand hover:underline">{a.ruleset.name}</Link>
              <span className="text-xs text-muted">v{v?.version}</span>
            </div>
            {v && (
              <p className="text-sm text-muted">
                {fields
                  .map((f) => (displayValue(f, v.rules[f.key]) !== "—" ? `${f.label}: ${displayValue(f, v.rules[f.key])}` : null))
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <p className="text-xs text-muted">
              {a.targetType === "series" ? t("media.rs.usedEveryWeek", { name: seriesName ?? t("media.rs.thisWeekly") }) : t("media.rs.forThisEvent")} · {fromBefore}
              <Link href={`/scenes/${a.ruleset.sceneSlug}`} className="underline">{a.ruleset.sceneName}</Link>{fromAfter}
            </p>
            {myIds.has(a.ruleset.id) && (
              <form action={detachRuleset.bind(null, a.id)}>
                <button className="text-xs text-muted underline">{t("media.rs.remove")}</button>
              </form>
            )}
          </div>
        );
      })}
      {userId && <AttachRulesetForm options={options} tournamentSlug={tournamentSlug} seriesId={seriesId} seriesName={seriesName} />}
    </section>
  );
}
