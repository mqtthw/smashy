"use client";

import { useActionState } from "react";
import { openBracketLink } from "./actions";
import { useT } from "@/lib/i18n/client";

export default function OpenLinkForm() {
  const t = useT();
  const [state, action, pending] = useActionState(openBracketLink, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="bracket-link" className="font-semibold">{t("browse.events.openAnyBracket")}</label>
      <div className="flex gap-2">
        <input
          id="bracket-link"
          name="link"
          required
          inputMode="url"
          placeholder={t("browse.brackets.pastePlaceholder")}
          className="field min-w-0 flex-1"
        />
        <button disabled={pending} className="btn btn-md btn-primary shrink-0">{pending ? t("browse.brackets.opening") : t("browse.brackets.open")}</button>
      </div>
      {state.error && <p className="text-meta text-danger">{state.error}</p>}
    </form>
  );
}
