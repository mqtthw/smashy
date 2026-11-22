"use client";
// League forms and buttons (step L1): the new-league form, join/leave, and the organizer's remove.
import { useActionState, useState, useTransition } from "react";
import GameOptions from "@/components/GameOptions";
import { useT } from "@/lib/i18n/client";
import { createLeague, joinLeague, leaveLeague, removeLeaguePlayer, type LeagueFormState } from "./actions";

export function NewLeagueForm() {
  const t = useT();
  const [state, action, pending] = useActionState<LeagueFormState, FormData>(createLeague, {});
  const [online, setOnline] = useState(true);
  const [playoffs, setPlayoffs] = useState(true);
  const [day, setDay] = useState(() => new Date().toLocaleDateString("en-CA"));
  // Week 1 opens at the start of the chosen day, in the organizer's own time zone.
  const iso = day ? new Date(`${day}T00:00:00`).toISOString() : "";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="starts_at_iso" value={iso} />
      <input type="hidden" name="timezone" value={tz} />
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("league.field.name")}</span>
        <input name="name" required minLength={3} maxLength={80} placeholder={t("league.field.namePlaceholder")} className="field" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("league.field.game")}</span>
        <select name="game" defaultValue="melee" className="field"><GameOptions /></select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("league.field.where")}</legend>
        <div className="flex gap-2">
          <label className="chip cursor-pointer"><input type="radio" name="online" value="online" checked={online} onChange={() => setOnline(true)} className="sr-only" />{t("league.field.online")}</label>
          <label className="chip cursor-pointer"><input type="radio" name="online" value="in_person" checked={!online} onChange={() => setOnline(false)} className="sr-only" />{t("league.field.inPerson")}</label>
        </div>
        {!online && <input name="location" required minLength={2} maxLength={120} placeholder={t("league.field.locationPlaceholder")} className="field" />}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("league.field.starts")}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} required className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("league.field.weeks")}</span>
          <input type="number" name="weeks" min={1} max={20} defaultValue={6} className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("league.field.bestOf")}</span>
          <select name="best_of" defaultValue="3" className="field">
            {[1, 3, 5].map((n) => <option key={n} value={n}>{t("league.field.bestOfN", { n })}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("league.field.cap")}</span>
          <input type="number" name="player_cap" min={2} max={256} defaultValue={64} className="field" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="playoffs" checked={playoffs} onChange={(e) => setPlayoffs(e.target.checked)} className="h-4 w-4" />
        {t("league.field.playoffs")}
      </label>
      {playoffs && (
        <label className="flex items-center gap-2 text-sm">
          {t("league.field.playoffSizeBefore")}
          <input type="number" name="playoff_size" min={2} max={16} defaultValue={4} className="field w-20" />
          {t("league.field.playoffSizeAfter")}
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("league.field.description")}</span>
        <textarea name="description" maxLength={2000} rows={4} placeholder={t("league.field.descriptionPlaceholder")} className="field resize-y" />
      </label>
      <p className="text-meta text-muted">{t("league.new.next")}</p>
      <button disabled={pending || !iso} className="btn btn-lg btn-primary self-start">{pending ? t("common.saving") : t("league.new.create")}</button>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function JoinLeagueButton({ id, joined }: { id: string; joined: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = () =>
    start(async () => {
      const res = joined ? await leaveLeague(id) : await joinLeague(id);
      setError(res.error ?? null);
    });
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={run} disabled={pending} className={`btn btn-md self-start ${joined ? "btn-outline" : "btn-primary"}`}>
        {joined ? t("league.leave") : t("league.join")}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function RemovePlayerButton({ id, person, tag }: { id: string; person: string; tag: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(t("league.removeConfirm", { tag })) && start(async () => void (await removeLeaguePlayer(id, person)))}
      className="btn btn-sm btn-ghost"
      aria-label={t("league.removeLabel", { tag })}
    >
      ✕
    </button>
  );
}
