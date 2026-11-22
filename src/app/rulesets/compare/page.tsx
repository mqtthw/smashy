import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GAMES } from "@/lib/games";
import { RULESET_FIELDS, displayValue, sameValue, type RuleField } from "@/lib/rulesetFields";
import { getVersionWithRuleset } from "@/lib/scenes";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.compareRulesets") };
}

/** For stage lists, show what's only on one side so differences pop out. */
function StageDiff({ mine, theirs }: { mine: string[]; theirs: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {mine.map((s) => (
        <span key={s} className={`rounded px-1.5 py-0.5 text-xs ${theirs.includes(s) ? "bg-surface" : "bg-brand/10 font-semibold text-brand"}`}>
          {s}
        </span>
      ))}
      {mine.length === 0 && "—"}
    </span>
  );
}

async function Comparison({ searchParams }: { searchParams: PageProps<"/rulesets/compare">["searchParams"] }) {
  const { a, b, all } = await searchParams;
  const [left, right, t] = await Promise.all([getVersionWithRuleset(String(a ?? "")), getVersionWithRuleset(String(b ?? "")), getT()]);
  if (!left || !right) {
    return (
      <>
        <h1 className="text-2xl font-bold">{t("browse.compare.title")}</h1>
        <p className="text-muted">{t("browse.compare.pickTwo")}</p>
      </>
    );
  }

  const sameRuleset = left.ruleset.id === right.ruleset.id;
  const label = (side: typeof left) =>
    sameRuleset ? `v${side.version.version}` : `${side.ruleset.sceneName} (v${side.version.version})`;

  // Fields from the left game's layout, plus any extra fields the right game has.
  const groups = RULESET_FIELDS[left.ruleset.game].map((g) => ({ ...g }));
  if (right.ruleset.game !== left.ruleset.game) {
    const known = new Set(groups.flatMap((g) => g.fields.map((f) => f.key)));
    const extra = RULESET_FIELDS[right.ruleset.game].flatMap((g) => g.fields).filter((f) => !known.has(f.key));
    if (extra.length) groups.push({ title: t("browse.compare.gameOnly", { game: GAMES[right.ruleset.game].short }), fields: extra });
  }

  const showAll = all === "1";
  const rows = groups
    .map((g) => ({
      title: g.title,
      fields: g.fields.filter((f) => showAll || !sameValue(left.version.rules[f.key], right.version.rules[f.key])),
    }))
    .filter((g) => g.fields.length);
  const notesDiffer = (left.version.notes ?? "") !== (right.version.notes ?? "");
  const diffCount = groups.flatMap((g) => g.fields).filter((f) => !sameValue(left.version.rules[f.key], right.version.rules[f.key])).length;

  const cell = (f: RuleField, mine: typeof left, theirs: typeof left) =>
    f.type === "stages" ? (
      <StageDiff mine={(mine.version.rules[f.key] as string[]) ?? []} theirs={(theirs.version.rules[f.key] as string[]) ?? []} />
    ) : (
      displayValue(f, mine.version.rules[f.key])
    );

  const toggleHref = `/rulesets/compare?a=${left.version.id}&b=${right.version.id}${showAll ? "" : "&all=1"}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {sameRuleset ? t("browse.compare.whatChanged", { name: left.ruleset.name }) : `${left.ruleset.sceneName} vs ${right.ruleset.sceneName}`}
      </h1>
      {left.ruleset.game !== right.ruleset.game && (
        <p className="rounded-lg bg-surface p-3 text-sm">{t("browse.compare.differentGames")}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {diffCount === 0 && !notesDiffer ? t("browse.compare.noDifferences") : `${t("browse.compare.rulesDiffer", { n: diffCount })}${notesDiffer ? t("browse.compare.notesDiffer") : ""}${t("common.period")}`}
        </p>
        <Link href={toggleHref} className="text-brand">{showAll ? t("browse.compare.showOnlyDiff") : t("browse.compare.showAll")}</Link>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full table-fixed hyphens-auto break-words text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="w-1/4 px-3 py-2 font-semibold">{t("browse.compare.rule")}</th>
              <th className="px-3 py-2 font-semibold">
                <Link href={`/rulesets/${left.ruleset.id}?v=${left.version.version}`} className="hover:underline">{label(left)}</Link>
              </th>
              <th className="px-3 py-2 font-semibold">
                <Link href={`/rulesets/${right.ruleset.id}?v=${right.version.version}`} className="hover:underline">{label(right)}</Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => [
              <tr key={g.title} className="bg-surface"><td colSpan={3} className="px-3 py-1.5 text-xs font-bold uppercase text-muted">{g.title}</td></tr>,
              ...g.fields.map((f) => {
                const differs = !sameValue(left.version.rules[f.key], right.version.rules[f.key]);
                return (
                  <tr key={f.key} className="border-t border-line align-top">
                    <td className="px-3 py-2 font-semibold">{f.label}</td>
                    <td className={`px-3 py-2 ${differs ? "bg-brand/5" : ""}`}>{cell(f, left, right)}</td>
                    <td className={`px-3 py-2 ${differs ? "bg-brand/5" : ""}`}>{cell(f, right, left)}</td>
                  </tr>
                );
              }),
            ])}
            {(notesDiffer || showAll) && (
              <tr className="border-t border-line align-top">
                <td className="px-3 py-2 font-semibold">{t("browse.compare.notes")}</td>
                <td className="whitespace-pre-wrap px-3 py-2 text-xs">{left.version.notes ?? "—"}</td>
                <td className="whitespace-pre-wrap px-3 py-2 text-xs">{right.version.notes ?? "—"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{t("browse.compare.highlighted")}</p>
    </div>
  );
}

export default function ComparePage(props: PageProps<"/rulesets/compare">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/scenes" className="pt-2 text-sm text-muted hover:text-foreground"><T k="browse.ruleset.backScenes" /></Link>
      <Suspense fallback={<PageSkeleton />}>
        <Comparison searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
