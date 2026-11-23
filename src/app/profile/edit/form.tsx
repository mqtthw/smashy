"use client";

import { CHARACTERS, MAX_MAINS, type Main } from "@/lib/characters";
import { useActionState, useState } from "react";
import { keepValuesOnSubmit } from "@/lib/forms";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { updateProfile, type EditState } from "./actions";
import MainBadge from "@/components/MainBadge";
import { costumeIcons } from "@/lib/mainBadge";
import RegionSelect from "@/components/RegionSelect";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import { SOCIALS, type SocialColumn } from "@/lib/socials";

const field = "field";

export default function EditProfileForm(props: {
  tag: string;
  handle: string;
  homeCity: string | null;
  bio: string | null;
  crew?: string | null;
  lfgDoubles?: boolean;
  region?: string | null;
  games: GameKey[];
  isProtected: boolean;
  isMinor: boolean;
  mains?: Main[];
  socials?: Partial<Record<SocialColumn, string | null>>;
}) {
  const t = useT();
  const [mains, setMains] = useState<Main[]>(props.mains ?? []);
  const [state, action, pending] = useActionState<EditState, FormData>(updateProfile, {});
  const [handle, setHandle] = useState(props.handle);
  const [bio, setBio] = useState(props.bio ?? "");
  const [games, setGames] = useState<GameKey[]>(props.games);

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("people.edit.tag")}</span>
        <input name="tag" required maxLength={30} defaultValue={props.tag} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("people.edit.handle")}</span>
        <span className="text-xs text-muted">{t("people.edit.handleHelp")}</span>
        <div className="flex items-center rounded-lg border border-line-strong bg-field pl-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
          <span className="text-muted">@</span>
          <input
            name="handle"
            required
            minLength={3}
            maxLength={20}
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            className="min-w-0 flex-1 bg-transparent px-1 py-2 outline-none"
          />
        </div>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("people.edit.bio")} <span className="font-normal text-muted">{t("people.edit.left", { n: 160 - bio.length })}</span></span>
        <textarea name="bio" maxLength={160} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className={field} placeholder={t("people.edit.bioPlaceholder")} />
        <span className="text-xs text-muted">{t("people.edit.bioHelp")}</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("people.edit.where")}</span>
        <span className="text-xs text-muted">{t("people.edit.whereHelp")}</span>
        <RegionSelect defaultValue={props.region ?? "US-TX"} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("people.edit.city")} <span className="font-normal text-muted">{t("people.edit.optional")}</span></span>
        <input name="home_city" maxLength={60} defaultValue={props.homeCity ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("people.edit.crew")} <span className="font-normal text-muted">{t("people.edit.optional")}</span></span>
        <input name="crew" maxLength={40} defaultValue={props.crew ?? ""} className={field} placeholder={t("people.edit.crewPlaceholder")} />
      </label>
      {/* Folded by default so six boxes don't fill the screen; the closed row says which are set.
          Boxes inside a closed <details> are still sent with the form. */}
      <details className="group rounded-lg border border-line-strong">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold">{t("people.edit.socials")} <span className="font-normal text-muted">{t("people.edit.optional")}</span></span>
          <span className="ml-auto min-w-0 truncate text-sm text-muted">
            {SOCIALS.filter((s) => props.socials?.[s.column]).map((s) => s.label).join(", ") || t("people.edit.socialsNone")}
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 fill-none stroke-current text-muted transition group-open:rotate-180" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <div className="flex flex-col gap-2 border-t border-line px-3 pb-3 pt-2">
          {props.isMinor ? (
            <p className="text-sm text-muted">{t("people.edit.socialsAdults")}</p>
          ) : (
            <>
              <p className="text-xs text-muted">{t("people.edit.socialsHelp")}</p>
              {SOCIALS.map((s) => (
                <label key={s.key} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
                  <span className="text-sm">{s.label}</span>
                  <input name={s.column} maxLength={200} defaultValue={props.socials?.[s.column] ?? ""} className={`${field} w-full min-w-0`} placeholder={s.key === "slippi" ? "ABCD#123" : t("people.edit.socialPlaceholder")} autoComplete="off" autoCapitalize="off" spellCheck={false} />
                </label>
              ))}
            </>
          )}
        </div>
      </details>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("people.games")}</legend>
        <p className="-mt-1 text-meta text-muted">{t("people.edit.gamesHelp")}</p>
        <div className="flex flex-wrap gap-2">
          {GAME_KEYS.map((g) => (
            <label key={g} className="flex cursor-pointer items-center chip">
              <input
                type="checkbox"
                name="games"
                value={g}
                checked={games.includes(g)}
                onChange={() => {
                  const next = games.includes(g) ? games.filter((x) => x !== g) : [...games, g];
                  setGames(next);
                  setMains((cur) => cur.filter((m) => next.includes(m.game))); // a main needs its game picked
                }}
                className="sr-only"
              />
              {GAMES[g].short}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("people.edit.mains")} <span className="font-normal text-muted">{t("people.edit.upTo", { n: MAX_MAINS })}</span></legend>
        <input type="hidden" name="mains" value={JSON.stringify(mains.filter((m) => games.includes(m.game)))} />
        {mains.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <CostumePicker main={m} label={t("people.edit.mainCostume", { n: i + 1 })} onPick={(costume) => setMains((cur) => cur.map((x, j) => (j === i ? { game: x.game, character: x.character, ...(costume > 1 ? { costume } : {}) } : x)))} />
            <select
              aria-label={t("people.edit.mainGame", { n: i + 1 })}
              value={m.game}
              onChange={(e) => setMains((cur) => cur.map((x, j) => (j === i ? { game: e.target.value as GameKey, character: CHARACTERS[e.target.value as GameKey][0].key } : x)))}
              className={field}
            >
              {games.map((g) => <option key={g} value={g}>{GAMES[g].short}</option>)}
            </select>
            <select
              aria-label={t("people.edit.mainCharacter", { n: i + 1 })}
              value={m.character}
              onChange={(e) => setMains((cur) => cur.map((x, j) => (j === i ? { game: x.game, character: e.target.value } : x)))}
              className={`${field} min-w-0 flex-1`}
            >
              {CHARACTERS[m.game].map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
            <button type="button" onClick={() => setMains((cur) => cur.filter((_, j) => j !== i))} className="btn btn-sm btn-ghost" aria-label={t("people.edit.removeMain", { n: i + 1 })}>✕</button>
          </div>
        ))}
        {mains.length < MAX_MAINS && games.length > 0 && (
          <button
            type="button"
            onClick={() => setMains((cur) => [...cur, { game: games[0], character: CHARACTERS[games[0]][0].key }])}
            className="btn btn-sm btn-outline self-start"
          >
            {t("people.edit.addMain")}
          </button>
        )}
      </fieldset>
      <label className="flex items-start gap-3 card p-3">
        <input type="checkbox" name="lfg_doubles" defaultChecked={props.lfgDoubles} className="mt-1" />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold"><Icon name="users" /> {t("people.edit.lfg")}</span>
          <span className="text-xs text-muted">{t("people.edit.lfgHelp")}</span>
        </span>
      </label>
      <label className="flex items-start gap-3 card p-3">
        <input type="checkbox" name="protected" defaultChecked={props.isProtected || props.isMinor} disabled={props.isMinor} className="mt-1" />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold"><Icon name="lock" /> {t("people.edit.protect")}</span>
          <span className="text-xs text-muted">
            {t("people.edit.protectHelp")}
            {props.isMinor && ` ${t("people.edit.protectMinor")}`}
          </span>
        </span>
      </label>
      {props.isMinor && <input type="hidden" name="protected" value="on" />}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn btn-lg btn-primary">
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}

/**
 * The main's stock icon as a button (round 728, Paper King's idea): press it to see every costume's
 * icon and pick the one you play. A character with one icon, or none, just shows the badge.
 */
function CostumePicker({ main, label, onPick }: { main: Main; label: string; onPick: (costume: number) => void }) {
  const [open, setOpen] = useState(false);
  const icons = costumeIcons(main);
  if (icons.length < 2) return <span className="flex w-8 shrink-0 justify-center" aria-hidden="true"><MainBadge main={main} size="md" /></span>;
  const chosen = Math.min(main.costume ?? 1, icons.length);
  return (
    <span className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={label} title={label} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-field hover:bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icons[chosen - 1]} alt="" width={24} height={24} />
      </button>
      {open && (
        <span role="listbox" aria-label={label} className="absolute left-0 top-10 z-20 grid w-max grid-cols-4 gap-1 rounded-xl border border-line bg-background p-2 shadow-xl">
          {icons.map((src, i) => (
            <button
              key={src}
              type="button"
              role="option"
              aria-selected={chosen === i + 1}
              aria-label={`${label}: ${i + 1}`}
              onClick={() => {
                onPick(i + 1);
                setOpen(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface ${chosen === i + 1 ? "ring-2 ring-brand" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" width={28} height={28} loading="lazy" />
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
