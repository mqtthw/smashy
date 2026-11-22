"use client";

import { useActionState, useState } from "react";
import { GAME_KEYS, GAMES } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { SUGGESTION_KINDS, type SuggestionKind } from "@/lib/suggestionForm";
import { sendSuggestion, type HelpState } from "./actions";

const KIND_LABEL: Record<SuggestionKind, MessageKey> = {
  resource: "ui.help.kind.resource",
  local: "ui.help.kind.local",
  history: "ui.help.kind.history",
  feedback: "ui.help.kind.feedback",
};
const DETAILS_LABEL: Record<SuggestionKind, MessageKey> = {
  resource: "ui.help.details.resource",
  local: "ui.help.details.local",
  history: "ui.help.details.history",
  feedback: "ui.help.details.feedback",
};
const ERROR: Record<NonNullable<HelpState["error"]>, MessageKey> = {
  kind: "ui.help.err.failed",
  link: "ui.help.err.link",
  needLink: "ui.help.err.needLink",
  needDetails: "ui.help.err.needDetails",
  tooLong: "ui.help.err.tooLong",
  tooMany: "ui.help.err.tooMany",
  failed: "ui.help.err.failed",
};

/** One form for every kind of suggestion; the fields change with the kind picked. */
export default function HelpForm({ initialKind }: { initialKind: SuggestionKind }) {
  const t = useT();
  const [kind, setKind] = useState<SuggestionKind>(initialKind);
  const [round, setRound] = useState(0); // "Send another" starts a fresh form
  const [state, action, pending] = useActionState<HelpState, FormData>(sendSuggestion, {});
  const [dismissed, setDismissed] = useState<HelpState | null>(null); // the "thanks" already closed
  const sent = state.sent && state !== dismissed;

  if (sent) {
    return (
      <div className="card flex flex-col gap-3 p-4 text-sm" role="status">
        <p className="font-semibold">{t("ui.help.thanks")}</p>
        <button
          type="button"
          className="btn btn-md btn-outline self-start"
          onClick={() => {
            setDismissed(state);
            setRound(round + 1);
          }}
        >
          {t("ui.help.another")}
        </button>
      </div>
    );
  }

  return (
    <form key={round} action={action} className="card flex flex-col gap-3 p-4 text-sm">
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" aria-label={t("ui.help.formTitle")} className="flex flex-wrap gap-2">
        {SUGGESTION_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`chip py-1 ${kind === k ? "bg-foreground text-background" : ""}`}
          >
            {t(KIND_LABEL[k])}
          </button>
        ))}
      </div>

      {kind !== "feedback" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            {t("ui.help.game")}
            <select name="game" defaultValue="" className="field">
              <option value="">{t("ui.help.anyGame")}</option>
              {GAME_KEYS.map((g) => (
                <option key={g} value={g}>{GAMES[g].short}</option>
              ))}
            </select>
          </label>
          {kind === "resource" && (
            <label className="flex flex-col gap-1">
              {t("ui.help.character")}
              <input name="character" maxLength={60} className="field" />
            </label>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1">
        {t(kind === "resource" ? "ui.help.link" : "ui.help.linkOptional")}
        <input name="link" type="text" inputMode="url" required={kind === "resource"} maxLength={500} placeholder="https://" className="field" />
      </label>

      <label className="flex flex-col gap-1">
        {t(DETAILS_LABEL[kind])}
        <textarea name="details" rows={4} maxLength={2000} required={kind !== "resource"} className="field" />
      </label>

      <label className="flex flex-col gap-1">
        {t("ui.help.contact")}
        <input name="contact" maxLength={200} autoComplete="email" className="field" />
        <span className="text-meta text-muted">{t("ui.help.contactNote")}</span>
      </label>

      {/* For bots only: hidden from people and screen readers. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.error && <p role="alert" className="text-danger">{t(ERROR[state.error])}</p>}
      <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-md btn-primary self-start">
        {pending ? t("ui.help.sending") : t("ui.help.submit")}
      </button>
    </form>
  );
}
