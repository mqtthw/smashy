"use client";

import { localeFor } from "@/lib/i18n/base";
import GameOptions from "@/components/GameOptions";

import { useActionState, useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { toEmbed } from "@/lib/embeds";
import { keepValuesOnSubmit } from "@/lib/forms";
import type { GameKey } from "@/lib/games";
import { GUIDE_MAX_LENGTH, HIGHLIGHT_TYPES, type HighlightType } from "@/lib/highlightTypes";
import { createHighlight, type HighlightFormState } from "../actions";
import { HIGHLIGHT_TYPE_KEYS } from "@/components/hub/TypeTabs";
import { useLang, useT } from "@/lib/i18n/client";

const input = "field";

export default function NewHighlightForm({ defaultGame, defaultCharacter = "", defaultVs = "", defaultType = "combo_video" }: { defaultGame: GameKey; defaultCharacter?: string; defaultVs?: string; defaultType?: HighlightType }) {
  const t = useT();
  const lang = useLang();
  const [state, action, pending] = useActionState<HighlightFormState, FormData>(createHighlight, {});
  const [type, setType] = useState<HighlightType>(defaultType);
  const [game, setGame] = useState<GameKey>(defaultGame);
  const [character, setCharacter] = useState(defaultCharacter);
  const [vs, setVs] = useState(defaultVs);
  const [url, setUrl] = useState("");
  const [guide, setGuide] = useState("");

  const embed = url.trim() ? toEmbed(url.trim()) : null;
  const linkHint = !url.trim()
    ? t("media.hl.linkHint")
    : !embed
      ? t("media.hl.linkBad")
      : embed.kind === "player"
        ? t("media.hl.linkPlayer", { provider: embed.provider })
        : t("media.hl.linkCard", { provider: embed.provider });
  const optional = <span className="font-normal text-muted">{t("media.optional")}</span>;

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("media.hl.type")}</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as HighlightType)} className={input}>
            {(Object.keys(HIGHLIGHT_TYPES) as HighlightType[]).map((k) => <option key={k} value={k}>{t(HIGHLIGHT_TYPE_KEYS[k])}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("media.hl.game")}</span>
          <select
            name="game"
            value={game}
            onChange={(e) => {
              setGame(e.target.value as GameKey);
              setCharacter("");
              setVs("");
            }}
            className={input}
          >
            <GameOptions />
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.hl.character")} <span className="font-normal text-muted">{t("media.hl.recommended")}</span></span>
        <span className="text-xs text-muted">{t("media.hl.characterHelp")}</span>
        <select name="character" value={character} onChange={(e) => { setCharacter(e.target.value); if (e.target.value === vs || !e.target.value) setVs(""); }} className={input}>
          <option value="">{t("media.hl.general")}</option>
          {CHARACTERS[game].map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </label>
      {character && (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("media.hl.against")} {optional}</span>
          <span className="text-xs text-muted">{t("media.hl.againstHelp")}</span>
          <select name="vs_character" value={vs} onChange={(e) => setVs(e.target.value)} className={input}>
            <option value="">{t("media.hl.anyOpponent")}</option>
            {CHARACTERS[game].filter((c) => c.key !== character).map((c) => <option key={c.key} value={c.key}>{t("media.vsName", { name: c.name })}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.hl.title")}</span>
        <input name="title" required minLength={3} maxLength={100} className={input} placeholder={t("media.hl.titlePlaceholder")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.hl.link")} {type === "guide" ? optional : null}</span>
        <input name="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} className={input} placeholder="https://youtu.be/…" />
        <span className={`text-xs ${url.trim() && !embed ? "text-brand" : "text-muted"}`}>{linkHint}</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.hl.description")} {optional}</span>
        <input name="description" maxLength={300} className={input} placeholder={t("media.hl.descriptionPlaceholder")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">
          {t("media.hl.guide")} <span className="font-normal text-muted">{t(type === "guide" ? "media.hl.guideWhere" : "media.optional")}</span>
        </span>
        <textarea name="guide_body" value={guide} onChange={(e) => setGuide(e.target.value)} maxLength={GUIDE_MAX_LENGTH} rows={type === "guide" ? 12 : 4} className={input} placeholder={t("media.hl.guidePlaceholder")} />
        <span className="text-xs text-muted">{t("media.hl.charsLeft", { n: GUIDE_MAX_LENGTH - guide.length, count: (GUIDE_MAX_LENGTH - guide.length).toLocaleString(localeFor(lang)) })}</span>
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn btn-lg btn-primary">
        {pending ? t("common.saving") : t("media.hl.submit")}
      </button>
    </form>
  );
}
