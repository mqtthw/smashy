"use client";

import RegionSelect from "@/components/RegionSelect";

import { useActionState, useEffect, useRef, useState } from "react";
import BirthdateFields from "@/components/BirthdateFields";
import { keepValuesOnSubmit } from "@/lib/forms";
import { suggestHandle } from "@/lib/handles";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { checkHandle, completeProfile, type HandleCheck, type WelcomeState } from "./actions";
import { useT } from "@/lib/i18n/client";

const field = "field";

// Suggestions only; people can type any city.
const TEXAS_CITIES = ["San Antonio", "Austin", "Houston", "Dallas", "Fort Worth", "El Paso", "Arlington", "Plano", "Denton", "College Station", "San Marcos", "Lubbock", "McAllen", "Corpus Christi", "Laredo", "Waco", "Tyler", "Abilene"];

export default function WelcomeForm({
  currentYear,
  needsInvite = false,
  inviteCode = "",
  defaultRegion = "US-TX",
  citySuggestions = [],
  suggestedTag = "",
}: {
  currentYear: number;
  needsInvite?: boolean;
  inviteCode?: string;
  defaultRegion?: string;
  citySuggestions?: string[]; // cities with Smash events in the person's area
  suggestedTag?: string; // from Discord, to keep or change (lib/signupPrefill.ts)
}) {
  const t = useT();
  const [state, action, pending] = useActionState<WelcomeState, FormData>(completeProfile, {});
  const errorRef = useRef<HTMLParagraphElement>(null);
  // Each new error from the server comes into view (the page may be scrolled anywhere).
  useEffect(() => {
    if (state.error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);
  // Controlled so answers survive a form error.
  const [tag, setTag] = useState(suggestedTag);
  const [handle, setHandle] = useState(() => suggestHandle(suggestedTag));
  const [check, setCheck] = useState<(HandleCheck & { handle: string }) | null>(null);
  // Checks the handle a moment after typing stops (one request per pause, not per key).
  useEffect(() => {
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) return;
    let alive = true;
    const timer = setTimeout(() => {
      checkHandle(handle)
        .then((r) => alive && setCheck({ ...r, handle }))
        .catch(() => {});
    }, 450);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [handle]);
  const shownCheck = check && check.handle === handle ? check : null;
  const [handleEdited, setHandleEdited] = useState(false);
  const [city, setCity] = useState("");
  const [games, setGames] = useState<GameKey[]>([]);

  const toggleGame = (g: GameKey) => setGames((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-5">
      {needsInvite && (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("feed.welcome.invite")}</span>
          <span className="text-xs text-muted">{t("feed.welcome.inviteNote")}</span>
          <input name="invite" required defaultValue={inviteCode} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="SMASH-XXXXX" className={`${field} uppercase`} />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("feed.welcome.tag")}</span>
        <span className="text-xs text-muted">{t("feed.welcome.tagNote")}</span>
        <input
          name="tag"
          required
          maxLength={30}
          autoComplete="nickname"
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            if (!handleEdited) setHandle(suggestHandle(e.target.value)); // suggest a handle until they pick their own
          }}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("feed.welcome.handle")}</span>
        <span className="text-xs text-muted">{t("feed.welcome.handleNote", { handle: handle || t("feed.welcome.yourname") })}</span>
        <div className="flex items-center rounded-lg border border-line-strong bg-field pl-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
          <span className="text-muted">@</span>
          <input
            name="handle"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]{3,20}"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
              setHandleEdited(true);
            }}
            aria-describedby="handle-check"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 outline-none"
          />
        </div>
        <span id="handle-check" aria-live="polite" className="text-xs">
          {shownCheck?.state === "free" && <span className="text-success">✓ {t("feed.welcome.handleFree", { handle })}</span>}
          {shownCheck?.state === "taken" && (
            <span className="text-danger">
              {t("feed.welcome.err.handleTaken")}
              {shownCheck.suggestion && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setHandle(shownCheck.suggestion!);
                      setHandleEdited(true);
                    }}
                  >
                    {t("feed.welcome.useHandle", { handle: shownCheck.suggestion })}
                  </button>
                </>
              )}
            </span>
          )}
          {shownCheck?.state === "invalid" && shownCheck.problem && <span className="text-danger">{shownCheck.problem}</span>}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("feed.welcome.where")}</span>
        <span className="text-xs text-muted">{t("feed.welcome.whereNote")}</span>
        <RegionSelect defaultValue={defaultRegion} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("feed.welcome.city")} <span className="font-normal text-muted">{t("feed.welcome.optional")}</span></span>
        <input name="home_city" maxLength={60} list="city-suggestions" value={city} onChange={(e) => setCity(e.target.value)} className={field} placeholder={t("feed.welcome.cityPlaceholder", { city: citySuggestions[0] ?? "San Antonio" })} />
        <datalist id="city-suggestions">
          {(citySuggestions.length ? citySuggestions : TEXAS_CITIES).map((c) => <option key={c} value={c} />)}
        </datalist>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("feed.welcome.games")}</legend>
        <p className="-mt-1 text-meta text-muted">{t("feed.welcome.gamesNote")}</p>
        <div className="flex flex-wrap gap-2">
          {GAME_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 chip">
              <input type="checkbox" name="games" value={key} checked={games.includes(key)} onChange={() => toggleGame(key)} className="sr-only" />
              {GAMES[key].short}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">{t("people.birthday.optional")}</legend>
        <BirthdateFields currentYear={currentYear} optional />
        <p className="text-xs text-muted">{t("people.birthday.why")}</p>
      </fieldset>
      {/* Next to the button and scrolled to (round 682): mid-form it was off-screen on phones. */}
      {state.error && (
        <p ref={errorRef} role="alert" className="scroll-mt-24 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn btn-lg btn-primary">
        {pending ? t("common.saving") : t("feed.welcome.create")}
      </button>
    </form>
  );
}
