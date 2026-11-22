import type { GameKey } from "@/lib/games";
import StageDiagram from "@/components/strike/StageDiagram";
import { RULESET_FIELDS, displayValue, type FieldValue } from "@/lib/rulesetFields";
import { T } from "@/lib/i18n/client";

/** Read-only ruleset, grouped, with the beginner explanation under each rule. */
export default function RulesetView({ game, rules, notes }: { game: GameKey; rules: Record<string, FieldValue>; notes: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      {RULESET_FIELDS[game].map((group) => {
        const filled = group.fields.filter((f) => displayValue(f, rules[f.key]) !== "—");
        if (!filled.length) return null;
        return (
          <section key={group.title} className="card">
            <h3 className="border-b border-line px-4 py-2 font-bold">{group.title}</h3>
            <dl className="divide-y divide-line">
              {filled.map((f) => (
                <div key={f.key} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[1fr_1.4fr] sm:gap-4">
                  <dt>
                    <span className="text-sm font-semibold">{f.label}</span>
                    <details className="text-xs text-muted">
                      <summary className="cursor-pointer select-none"><T k="media.rs.whatsThis" /></summary>
                      {f.help}
                    </details>
                  </dt>
                  <dd className="text-sm">
                    {f.type === "stages" && Array.isArray(rules[f.key]) ? (
                      <ul className="flex flex-wrap gap-2">
                        {(rules[f.key] as string[]).map((st) => (
                          <li key={st} className="flex flex-col items-center gap-0.5 rounded-lg border border-line px-2 py-1.5 text-center text-meta">
                            <StageDiagram name={st} className="h-8 w-16" />
                            {st}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      displayValue(f, rules[f.key])
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
      {notes && (
        <section className="card px-4 py-3">
          <h3 className="mb-1 font-bold"><T k="media.rs.notes" /></h3>
          <p className="whitespace-pre-wrap text-sm">{notes}</p>
        </section>
      )}
    </div>
  );
}
