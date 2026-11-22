"use client";

import { useActionState, useState } from "react";
import { createRuleset, publishVersion, type FormResult } from "@/app/scenes/actions";
import { keepValuesOnSubmit } from "@/lib/forms";
import { GAMES, type GameKey } from "@/lib/games";
import { RULESET_FIELDS, STAGES, type FieldValue, type RuleField } from "@/lib/rulesetFields";
import { useT } from "@/lib/i18n/client";

const input = "field";

function FieldInput({ field, game, value }: { field: RuleField; game: GameKey; value: FieldValue | undefined }) {
  const t = useT();
  const name = `f_${field.key}`;
  switch (field.type) {
    case "number":
      return (
        <div className="flex items-center gap-2">
          <input type="number" name={name} min={field.min} max={field.max} defaultValue={typeof value === "number" ? value : ""} className={`${input} w-24`} />
          {field.unit && <span className="text-sm text-muted">{field.unit}</span>}
        </div>
      );
    case "boolean":
      return (
        <select name={name} defaultValue={value === true ? "true" : value === false ? "false" : ""} className={input}>
          <option value="">{t("media.rs.notSpecified")}</option>
          <option value="true">{field.yes ?? t("common.yes")}</option>
          <option value="false">{field.no ?? t("common.no")}</option>
        </select>
      );
    case "select":
      return (
        <select name={name} defaultValue={typeof value === "string" ? value : ""} className={input}>
          <option value="">{t("media.rs.notSpecified")}</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case "stages": {
      const chosen = Array.isArray(value) ? value : [];
      const custom = chosen.filter((s) => !STAGES[game].includes(s));
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {STAGES[game].map((stage) => (
              <label key={stage} className="flex cursor-pointer items-center chip">
                <input type="checkbox" name={name} value={stage} defaultChecked={chosen.includes(stage)} className="sr-only" />
                {stage}
              </label>
            ))}
          </div>
          <input name={`${name}_custom`} defaultValue={custom.join(", ")} placeholder={t("media.rs.otherStages")} className={`${input} text-sm`} />
        </div>
      );
    }
    default:
      return <input name={name} maxLength={200} defaultValue={typeof value === "string" ? value : ""} placeholder={field.placeholder} className={input} />;
  }
}

/** Create a ruleset (mode "create") or publish a new version of one (mode "publish"). */
export default function RulesetEditor(
  props:
    | { mode: "create"; sceneId: string; games: GameKey[] }
    | { mode: "publish"; rulesetId: string; game: GameKey; rules: Record<string, FieldValue>; notes: string | null },
) {
  const t = useT();
  const [state, action, pending] = useActionState<FormResult, FormData>(props.mode === "create" ? createRuleset : publishVersion, {});
  const [game, setGame] = useState<GameKey>(props.mode === "create" ? props.games[0] : props.game);
  const rules = props.mode === "publish" ? props.rules : {};

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-6">
      {props.mode === "create" ? (
        <>
          <input type="hidden" name="scene_id" value={props.sceneId} />
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t("media.rs.name")}</span>
            <input name="name" required maxLength={80} className={input} placeholder={t("media.rs.namePlaceholder")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t("media.hl.game")}</span>
            <select name="game" value={game} onChange={(e) => setGame(e.target.value as GameKey)} className={input}>
              {props.games.map((g) => <option key={g} value={g}>{GAMES[g].name}</option>)}
            </select>
          </label>
        </>
      ) : (
        <input type="hidden" name="ruleset_id" value={props.rulesetId} />
      )}

      {/* key={game} resets the fields when switching games in create mode */}
      <div key={game} className="flex flex-col gap-6">
        {RULESET_FIELDS[game].map((group) => (
          <fieldset key={group.title} className="flex flex-col gap-4 card p-4">
            <legend className="px-1 font-bold">{group.title}</legend>
            {group.fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{f.label}</span>
                <span className="text-xs text-muted">{f.help}</span>
                <FieldInput field={f} game={game} value={rules[f.key]} />
              </div>
            ))}
          </fieldset>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.rs.notes")}</span>
        <span className="text-xs text-muted">{t("media.rs.notesHelp")}</span>
        <textarea name="notes" maxLength={4000} rows={5} defaultValue={props.mode === "publish" ? props.notes ?? "" : ""} className={input} />
      </label>

      {props.mode === "publish" && (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("media.rs.whatChanged")}</span>
          <span className="text-xs text-muted">{t("media.rs.whatChangedHelp")}</span>
          <input name="changelog" required maxLength={500} className={input} placeholder={t("media.rs.whatChangedPlaceholder")} />
        </label>
      )}

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn btn-lg btn-primary">
        {pending ? t("media.rs.publishing") : t(props.mode === "create" ? "media.rs.publish" : "media.rs.publishVersion")}
      </button>
    </form>
  );
}
