"use client";

import GameOptions from "@/components/GameOptions";

import { useActionState, useEffect, useState } from "react";
import { hostLobby, type HostState } from "@/app/play/actions";
import { keepValuesOnSubmit } from "@/lib/forms";
import type { GameKey } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

const input = "field";
// Placeholders are a phrase key, or an example code shown as it is.
const CONNECT: Record<GameKey, { label: MessageKey; placeholder: MessageKey | { code: string } }> = {
  melee: { label: "play.connect.melee", placeholder: { code: "ABCD#123" } },
  ultimate: { label: "play.connect.ultimate", placeholder: { code: "1ABC2 / 1234" } },
  pplus: { label: "play.connect.pplus", placeholder: "play.connect.roomCode" },
  smash64: { label: "play.connect.smash64", placeholder: "play.connect.roomOrCode" },
  brawl: { label: "play.connect.brawl", placeholder: "play.connect.hostCode" },
  smash4: { label: "play.connect.smash4", placeholder: "play.connect.roomOrCode" },
};

export default function HostLobbyForm({ defaultGame, defaultRegion }: { defaultGame: GameKey; defaultRegion: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const [game, setGame] = useState<GameKey>(defaultGame);
  const [state, action, pending] = useActionState<HostState, FormData>(hostLobby, {});

  // Collapse the form once the lobby is open.
  useEffect(() => {
    if (state.ok) setOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- close after the server confirms
  }, [state.ok]);

  const hint = CONNECT[game].placeholder;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-md btn-primary">
        {t("play.host.button")}
      </button>
    );
  }

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex w-full flex-col gap-3 card p-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("play.host.game")}</span>
          <select name="game" value={game} onChange={(e) => setGame(e.target.value as GameKey)} className={input}>
            <GameOptions />
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("play.host.openFor")}</span>
          <select name="minutes" defaultValue="60" className={input}>
            <option value="30">{t("play.host.30min")}</option>
            <option value="60">{t("play.host.1h")}</option>
            <option value="120">{t("play.host.2h")}</option>
            <option value="180">{t("play.host.3h")}</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("play.host.title")}</span>
        <input name="title" required minLength={3} maxLength={60} className={input} placeholder={t("play.host.titlePlaceholder")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t(CONNECT[game].label)}</span>
        <input name="connect_info" required maxLength={40} className={`${input} font-mono`} placeholder={typeof hint === "string" ? t(hint) : hint.code} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("play.host.type")}</span>
          <select name="mode" defaultValue="friendlies" className={input}>
            <option value="friendlies">{t("play.mode.friendlies")}</option>
            <option value="practice">{t("play.mode.practice")}</option>
            <option value="warmup">{t("play.mode.warmup")}</option>
            <option value="doubles">{t("play.mode.doubles")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("play.host.skill")}</span>
          <select name="skill" defaultValue="any" className={input}>
            <option value="any">{t("play.host.allLevels")}</option>
            <option value="beginner">{t("play.skill.beginner")}</option>
            <option value="intermediate">{t("play.skill.intermediate")}</option>
            <option value="advanced">{t("play.skill.advanced")}</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("play.host.region")}</span>
        <span className="text-xs text-muted">{t("play.host.regionHelp")}</span>
        <input name="region" required maxLength={40} defaultValue={defaultRegion} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("play.host.notes")} <span className="font-normal text-muted">{t("play.host.optional")}</span></span>
        <input name="notes" maxLength={200} className={input} placeholder={t("play.host.notesPlaceholder")} />
      </label>
      <p className="text-xs text-muted">{t("play.host.rules")}</p>
      {state.error && <p className="text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-muted">{t("common.cancel")}</button>
        <button disabled={pending} className="btn btn-md btn-primary">
          {pending ? t("play.host.opening") : t("play.host.open")}
        </button>
      </div>
    </form>
  );
}
