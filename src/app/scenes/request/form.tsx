"use client";

import { useActionState, useState } from "react";
import { keepValuesOnSubmit } from "@/lib/forms";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { requestScene, type FormResult } from "../actions";
import { useT } from "@/lib/i18n/client";

const field = "field";

export default function RequestSceneForm() {
  const t = useT();
  const [state, action, pending] = useActionState<FormResult, FormData>(requestScene, {});
  const [name, setName] = useState("");
  const [cities, setCities] = useState("");
  const [description, setDescription] = useState("");
  const [games, setGames] = useState<GameKey[]>([]);

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.req.name")}</span>
        <input name="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder={t("media.req.namePlaceholder")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.req.cities")}</span>
        <span className="text-xs text-muted">{t("media.req.citiesHelp")}</span>
        <input name="cities" required value={cities} onChange={(e) => setCities(e.target.value)} className={field} placeholder="San Antonio, New Braunfels" />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("media.req.games")}</legend>
        <div className="flex flex-wrap gap-2">
          {GAME_KEYS.map((g) => (
            <label key={g} className="flex cursor-pointer items-center chip">
              <input
                type="checkbox"
                name="games"
                value={g}
                checked={games.includes(g)}
                onChange={() => setGames((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
                className="sr-only"
              />
              {GAMES[g].short}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.req.about")} <span className="font-normal text-muted">{t("media.optional")}</span></span>
        <textarea name="description" maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={field} placeholder={t("media.req.aboutPlaceholder")} />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn btn-lg btn-primary">
        {pending ? t("media.req.sending") : t("media.req.send")}
      </button>
    </form>
  );
}
