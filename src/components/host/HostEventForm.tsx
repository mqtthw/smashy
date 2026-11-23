"use client";

import { useActionState, useEffect, useState } from "react";
import { saveHostedEvent, type HostFormState } from "@/app/host/actions";
import GameOptions from "@/components/GameOptions";
import { keepValuesOnSubmit } from "@/lib/forms";
import type { GameKey } from "@/lib/games";
import StartsPreview from "./StartsPreview";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export type HostFormEvent = {
  id: string;
  name: string;
  game: GameKey;
  online: boolean;
  location: string | null;
  region: string | null;
  startsAt: string;
  format: string;
  rulesetId: string | null;
  bestOf: number;
  bestOfTop: number | null;
  swissRounds?: number | null;
  finalFormat?: string | null;
  finalSize?: number | null;
  entrantCap: number;
  checkinMinutes: number;
  description: string | null;
  bracketName?: string | null;
  teamSize?: number;
  setups?: number | null;
  noShowMinutes?: number | null;
};

/** The main event an extra bracket belongs to. */
export type HostFormMain = { id: string; name: string; startsAt: string };

type RulesetOption = { id: string; name: string; sceneName: string; game: GameKey };

/** "2026-11-20T19:00" in this browser's time zone, for a datetime-local field. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The start of the name of the "Online" scene ruleset suggested for a new online event, per game. */
const STANDARD_ONLINE_RULESET: Partial<Record<GameKey, string>> = { ultimate: "The Box (", melee: "Slippi" };

/**
 * Host an event (or edit one you host): the basics, the format and ruleset, and sign-up settings.
 * With `main`, the same form adds (or edits) an extra bracket of that event: it has a short name of
 * its own and no "where", since it happens where the main event does.
 */
export default function HostEventForm({
  event,
  template,
  rulesets,
  defaultGame,
  main,
  canHostOfficial = false,
}: {
  event?: HostFormEvent;
  template?: HostFormEvent; // a new event starts from the host's last one (settings only, not name or time)
  rulesets: RulesetOption[];
  defaultGame: GameKey;
  main?: HostFormMain;
  /** A site admin: offer "Host as Smashy" (round 457). */
  canHostOfficial?: boolean;
}) {
  const t = useT();
  const base = event ?? template;
  const [state, action, pending] = useActionState<HostFormState, FormData>(saveHostedEvent, {});
  const [game, setGame] = useState<GameKey>(base?.game ?? defaultGame);
  const [online, setOnline] = useState(base?.online ?? true);
  const [format, setFormat] = useState(base?.format ?? "double_elim");
  const [finalFormat, setFinalFormat] = useState(base?.finalFormat ?? "");
  const firstPart = format === "round_robin" || format === "swiss"; // these can be followed by a final bracket
  const social = format === "social"; // no bracket (round 757): the bracket settings below are hidden
  const [local, setLocal] = useState("");
  const [tz, setTz] = useState("America/Chicago");
  const mainStart = main?.startsAt;
  // Singles or doubles: chosen when the event is made, fixed after that. A new bracket of an event starts as singles.
  const [teamSize, setTeamSize] = useState(event ? (event.teamSize ?? 1) : main ? 1 : (template?.teamSize ?? 1));
  // Times are typed in the host's own time zone (known only in the browser).
  useEffect(() => {
    void Promise.resolve().then(() => {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago");
      if (event) setLocal(toLocalInput(event.startsAt));
      // A new bracket starts when its main event does (or in 15 minutes, if that has already begun).
      else if (mainStart) setLocal(toLocalInput(new Date(Math.max(Date.parse(mainStart), Date.now() + 15 * 60_000)).toISOString()));
    });
  }, [event, mainStart]);
  const iso = local && !Number.isNaN(new Date(local).getTime()) ? new Date(local).toISOString() : "";
  const forGame = rulesets.filter((r) => r.game === game);
  // A standard online ruleset is suggested for new online events (Ultimate: The Box, Hungrybox's online
  // series; Melee: Slippi's stage list); the host can pick any other. null = not picked by hand yet.
  const [picked, setPicked] = useState<string | null>(base ? (base.rulesetId ?? "") : null);
  const standardName = STANDARD_ONLINE_RULESET[game];
  const standardOnline = (standardName && forGame.find((r) => r.sceneName === "Online" && r.name.startsWith(standardName))?.id) || "";
  const rulesetValue = picked ?? (online ? standardOnline : "");

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-4">
      {event && <input type="hidden" name="id" value={event.id} />}
      {!event && main && <input type="hidden" name="parent_id" value={main.id} />}
      {!event && template && !main && (
        <p className="rounded-lg bg-surface px-3 py-2 text-meta text-muted">
          {t("hostsetup.form.fromLastBefore")} <b className="text-foreground">{template.name}</b>{t("hostsetup.form.fromLastAfter")}
        </p>
      )}
      {main && (
        <p className="rounded-lg bg-surface px-3 py-2 text-meta text-muted">
          {t(event ? "hostsetup.form.bracketOf" : "hostsetup.form.newBracketFor")} <b className="text-foreground">{main.name}</b>{t("hostsetup.form.bracketAbout")}
        </p>
      )}
      <input type="hidden" name="starts_at_iso" value={iso} />
      <input type="hidden" name="timezone" value={tz} />

      {main ? (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("hostsetup.form.bracketName")}</span>
          <input name="bracket_name" defaultValue={event?.bracketName ?? ""} required minLength={2} maxLength={30} className="field" placeholder={t("hostsetup.form.bracketNamePlaceholder")} />
          <span className="text-meta text-muted">{t("hostsetup.form.bracketNameHint", { name: main.name })}</span>
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("hostsetup.form.eventName")}</span>
          <input name="name" defaultValue={event?.name} required minLength={3} maxLength={80} className="field" placeholder={t("hostsetup.form.eventNamePlaceholder")} />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("hostsetup.form.game")}</span>
          <select name="game" value={game} onChange={(e) => setGame(e.target.value as GameKey)} className="field" disabled={!!event}>
            <GameOptions />
          </select>
          {event && <input type="hidden" name="game" value={game} />}
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("hostsetup.form.starts")}</span>
          <input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} required className="field" />
          <span className="text-meta text-muted">{t("hostsetup.form.yourTime", { tz: tz.replace(/_/g, " ") })}</span>
          <StartsPreview iso={iso} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("hostsetup.form.entries")}</span>
        <select name="team_size" value={String(teamSize)} onChange={(e) => setTeamSize(Number(e.target.value))} className="field" disabled={!!event}>
          <option value="1">{t("hostsetup.form.singles")}</option>
          <option value="2">{t("hostsetup.form.doubles")}</option>
        </select>
        {event ? (
          <span className="text-meta text-muted">{t("hostsetup.form.entriesFixed")}</span>
        ) : teamSize === 2 ? (
          <span className="text-meta text-muted">{t("hostsetup.form.doublesHint")}</span>
        ) : null}
      </label>

      <fieldset className="flex flex-col gap-2" hidden={!!main}>
        <legend className="mb-1 font-semibold">{t("hostsetup.form.where")}</legend>
        <div className="flex gap-2">
          <label className="chip">
            <input type="radio" name="online" value="online" checked={online} onChange={() => setOnline(true)} className="sr-only" />
            <Icon name="globe" /> {t("event.online")}
          </label>
          <label className="chip">
            <input type="radio" name="online" value="in_person" checked={!online} onChange={() => setOnline(false)} className="sr-only" />
            <Icon name="pin" /> {t("event.inPerson")}
          </label>
        </div>
        {online ? (
          <input name="region" aria-label={t("hostsetup.form.region")} defaultValue={base?.region ?? ""} maxLength={40} className="field" placeholder={t("hostsetup.form.regionPlaceholder")} />
        ) : (
          <input name="location" aria-label={t("hostsetup.form.venue")} defaultValue={base?.location ?? ""} maxLength={120} required={!main} className="field" placeholder={t("hostsetup.form.venue")} />
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("hostsetup.form.format")}</span>
          <select name="format" value={format} onChange={(e) => setFormat(e.target.value)} className="field">
            <option value="double_elim">{t("format.double_elim")}</option>
            <option value="single_elim">{t("format.single_elim")}</option>
            <option value="round_robin">{t("format.round_robin")}</option>
            <option value="swiss">{t("format.swiss")}</option>
            <option value="social">{t("format.social")}</option>
          </select>
        </label>
        <label className={social ? "hidden" : "flex flex-col gap-1"}>
          <span className="font-semibold">{t("hostsetup.form.ruleset")}</span>
          <select name="ruleset_id" value={forGame.some((r) => r.id === rulesetValue) ? rulesetValue : ""} onChange={(e) => setPicked(e.target.value)} className="field">
            <option value="">{t("hostsetup.form.noRuleset")}</option>
            {forGame.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.sceneName})</option>)}
          </select>
        </label>
      </div>

      {format === "swiss" && (
        <p className="text-meta text-muted">
          {t("hostsetup.form.swissHint")}
        </p>
      )}
      {social && (
        <p className="text-meta text-muted">
          {t("hostsetup.form.socialHint")}
        </p>
      )}

      {firstPart && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t("hostsetup.form.finalBracket")}</span>
            <select name="final_format" value={finalFormat} onChange={(e) => setFinalFormat(e.target.value)} className="field">
              <option value="">{t(format === "swiss" ? "hostsetup.form.noFinalSwiss" : "hostsetup.form.noFinalPools")}</option>
              <option value="double_elim">{t("format.double_elim")}</option>
              <option value="single_elim">{t("format.single_elim")}</option>
            </select>
          </label>
          {finalFormat && (
            <label className="flex flex-col gap-1">
              <span className="font-semibold">{t("hostsetup.form.goThrough")}</span>
              <input type="number" name="final_size" min={2} max={64} defaultValue={base?.finalSize ?? 8} className="field" />
              <span className="text-meta text-muted">{t(format === "swiss" ? "hostsetup.form.goThroughSwiss" : "hostsetup.form.goThroughPools")}</span>
            </label>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className={social ? "hidden" : "flex flex-col gap-1"}>
          <span className="text-sm font-semibold">{t("hostsetup.form.bestOf")}</span>
          <input type="number" name="best_of" min={1} max={9} defaultValue={base?.bestOf ?? 3} className="field" />
        </label>
        {format === "swiss" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{t("hostsetup.form.rounds")}</span>
            <input type="number" name="swiss_rounds" min={1} max={12} defaultValue={base?.swissRounds ?? ""} placeholder={t("hostsetup.form.roundsPlaceholder")} title={t("hostsetup.form.roundsTitle")} className="field" />
          </label>
        )}
        {/* "Top 8" only exists in an elimination bracket: the event's own, or the final bracket after pools or Swiss. */}
        {!social && (!firstPart || finalFormat) && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{t("hostsetup.form.bestOfTop")}</span>
            <input type="number" name="best_of_top" min={1} max={9} defaultValue={base?.bestOfTop ?? ""} placeholder={t("hostsetup.form.samePlaceholder")} className="field" />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{t(teamSize === 2 ? "hostsetup.form.maxTeams" : "hostsetup.form.maxPlayers")}</span>
          <input type="number" name="entrant_cap" min={2} max={512} defaultValue={base?.entrantCap ?? 64} className="field" />
        </label>
        <label className={social ? "hidden" : "flex flex-col gap-1"}>
          <span className="text-sm font-semibold">{t("hostsetup.form.checkIn")}</span>
          <input type="number" name="checkin_minutes" min={0} max={240} defaultValue={base?.checkinMinutes ?? 30} className="field" />
        </label>
      </div>

      <fieldset className={social ? "hidden" : "flex flex-col gap-2"}>
        <legend className="mb-1 font-semibold">{t("hostsetup.form.runningNight")} <span className="font-normal text-muted">{t("hostsetup.form.optional")}</span></legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{t("hostsetup.form.setups")}</span>
            <input type="number" name="setups" min={1} max={64} defaultValue={base?.setups ?? ""} placeholder={t("hostsetup.form.byHand")} className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{t("hostsetup.form.noShow")}</span>
            <input type="number" name="no_show_minutes" min={3} max={60} defaultValue={base?.noShowMinutes ?? ""} placeholder={t("hostsetup.form.off")} className="field" />
          </label>
        </div>
        <p className="text-meta text-muted">
          {t("hostsetup.form.runningHint")}
        </p>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("hostsetup.form.description")} <span className="font-normal text-muted">{t("hostsetup.form.optional")}</span></span>
        <textarea name="description" defaultValue={base?.description ?? ""} maxLength={2000} rows={5} className="field resize-y" placeholder={t("hostsetup.form.descriptionPlaceholder")} />
      </label>

      {!event && !main && canHostOfficial && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="official" className="mt-0.5 h-4 w-4" />
          <span>
            <span className="font-semibold">{t("hostsetup.form.official")}</span>
            <span className="block text-meta text-muted">{t("hostsetup.form.officialHint")}</span>
          </span>
        </label>
      )}
      {!event && !main && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="share" defaultChecked className="h-4 w-4" />
          {t("hostsetup.form.share")}
        </label>
      )}
      <button disabled={pending || !iso} className="btn btn-lg btn-primary">{t(pending ? "common.saving" : event ? "hostsetup.form.saveChanges" : main ? "hostsetup.form.addBracket" : "hostsetup.form.create")}</button>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <p className="text-meta text-muted">{t("hostsetup.form.rules")}</p>
    </form>
  );
}
