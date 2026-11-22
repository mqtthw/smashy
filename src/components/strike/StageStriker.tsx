"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { bansAllowed, bansFor, pickable, score, strikeOrder, winsNeeded, type GameResult, type Side, type StrikeRules } from "@/lib/striking";
import { stageLayout } from "@/lib/stageLayouts";
import StageDiagram from "./StageDiagram";
import Scoreboard from "@/components/host/Scoreboard";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

type Phase = "setup" | "strike" | "report" | "ban" | "pick" | "agree" | "done";
type State = {
  phase: Phase;
  names: [string, string];
  first: Side; // who strikes first in game 1
  struck: string[]; // game 1 strikes
  banned: string[]; // this round's bans
  stage: string | null; // the stage being played
  history: GameResult[];
  agreeFrom: Phase | null; // where "both agree on a stage" was opened from
  starters: string[] | null; // quick striking: the stages the players chose as starters
  long: boolean; // this set is one of the ruleset's longer sets (e.g. best of 5 in Top 8)
};

const START: State = { phase: "setup", names: ["Player 1", "Player 2"], first: 0, struck: [], banned: [], stage: null, history: [], agreeFrom: null, starters: null, long: false };
const COLORS = ["text-brand", "text-player-2"] as const; // player 1 red, player 2 blue: a theme color, so it follows Smashy's Light/Dark switch

/** A phrase with one {placeholder} filled by a React node (a colored name): pass MARK as its value. */
const MARK = "\u0001";
function withNode(text: string, node: ReactNode) {
  return <>{text.split(/(\u0001)/).map((part, i) => (part === MARK ? <Fragment key={i}>{node}</Fragment> : part))}</>;
}

/**
 * Stage striking on one phone, passed between both players: game 1 strikes, then each game's bans
 * and counterpick, with the ruleset's DSR, until someone wins the set. The set in progress is kept in
 * this browser tab (sessionStorage), so a locked phone or a reload doesn't lose the score.
 * `pickStarters` (quick striking): players tick their starters; the other stages are counterpicks.
 * When the ruleset has longer sets, the players say which kind this one is (`longFrom`: where those
 * start, e.g. "Top 8").
 */
export default function StageStriker({
  rules: baseRules,
  gentlemans = false,
  allStages,
  rulesetName,
  storageKey,
  pickStarters = false,
  longFrom = null,
}: {
  rules: StrikeRules;
  gentlemans?: boolean;
  allStages: string[];
  rulesetName: string;
  storageKey: string;
  pickStarters?: boolean;
  longFrom?: string | null;
}) {
  const t = useT();
  const player = (n: number) => t("setroom.strike.player", { n });
  const [s, setS] = useState<State>(() => ({ ...START, names: [player(1), player(2)] }));
  const [past, setPast] = useState<State[]>([]);
  const key = `smashy-strike:${storageKey}`;
  // Pick up a set in progress after a reload (read after the first render, so server and browser match).
  useEffect(() => {
    let saved: State | null = null;
    try {
      saved = JSON.parse(window.sessionStorage.getItem(key) ?? "null") as State | null;
    } catch {}
    if (saved && saved.phase) void Promise.resolve().then(() => setS({ ...START, ...saved }));
  }, [key]);
  useEffect(() => {
    try {
      if (s.phase === "setup" && !s.history.length && !s.starters) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, JSON.stringify(s));
    } catch {}
  }, [s, key]);
  const rules: StrikeRules =
    pickStarters && s.starters ? { ...baseRules, starters: s.starters, counterpicks: allStages.filter((x) => !s.starters!.includes(x)) } : baseRules;
  const go = (next: State) => {
    setPast((p) => [...p.slice(-30), s]);
    setS(next);
  };
  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setS(prev);
  };

  const order = strikeOrder(rules.starters.length, rules.pattern).map((x) => ((x + s.first) % 2) as Side);
  const [w0, w1] = score(s.history);
  const bestOf = s.long && rules.bestOfLong ? rules.bestOfLong : rules.bestOf;
  const bans = bansFor(rules, bestOf);
  const need = winsNeeded(bestOf);
  const last = s.history[s.history.length - 1];
  const winner = last?.winner ?? 0;
  const loser = (1 - winner) as Side;
  const name = (side: Side) => <b className={COLORS[side]}>{s.names[side]}</b>;
  const pool = [...new Set([...rules.starters, ...rules.counterpicks])];

  const tile = (stage: string, opts: { onClick?: () => void; state?: "struck" | "banned" | "blocked" | "picked" | "open" }) => {
    const st = opts.state ?? "open";
    const cls =
      st === "struck" || st === "banned" ? "border-line text-muted line-through opacity-60"
      : st === "blocked" ? "border-line text-muted opacity-50"
      : st === "picked" ? "border-foreground bg-foreground text-background"
      : "border-line-strong hover:bg-surface active:scale-[0.98]";
    return (
      <li key={stage}>
        {/* The platform layout first: players recognize a stage by its shape faster than by its name. */}
        <button
          type="button"
          disabled={!opts.onClick}
          onClick={opts.onClick}
          className={`relative flex w-full flex-col items-center gap-1 rounded-xl border-2 px-2 pt-2 pb-2.5 text-center font-semibold transition ${cls}`}
        >
          <StageDiagram name={stage} className="h-16 w-32" />
          <span className="leading-tight">{stage}</span>
          {(st === "struck" || st === "banned") && (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-5xl font-black text-danger/70 no-underline">✕</span>
          )}
          {st === "struck" && <span className="sr-only">{t("setroom.strike.struck")}</span>}
          {st === "banned" && <span className="text-meta no-underline">{t("setroom.strike.banned")}</span>}
          {st === "blocked" && <span className="text-meta">{t("setroom.strike.blocked")}</span>}
        </button>
      </li>
    );
  };

  const header = s.phase !== "setup" && (
    <Scoreboard status={s.phase === "done" ? "final" : "live"} left={{ name: name(0), score: w0 }} right={{ name: name(1), score: w1 }} winner={s.phase === "done" ? (w0 > w1 ? 1 : 2) : null} />
  );

  const toolbar = s.phase !== "setup" && (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={undo} disabled={!past.length} className="btn btn-sm btn-ghost">{t("setroom.strike.undo")}</button>
      {gentlemans && (s.phase === "strike" || s.phase === "pick" || s.phase === "ban") && (
        <button type="button" onClick={() => go({ ...s, phase: "agree", agreeFrom: s.phase })} className="btn btn-sm btn-ghost">{t("setroom.strike.agree")}</button>
      )}
      {s.phase !== "done" && <button type="button" onClick={() => go({ ...START, names: s.names, starters: s.starters, long: s.long })} className="btn btn-sm btn-ghost ml-auto">{t("setroom.strike.newSet")}</button>}
    </div>
  );

  let body: React.ReactNode = null;
  if (s.phase === "setup") {
    body = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <label key={i} className="flex flex-col gap-1 text-sm">
              <span className={`font-semibold ${COLORS[i]}`}>{player(i + 1)}</span>
              <input
                value={s.names[i]}
                maxLength={30}
                onChange={(e) => setS({ ...s, names: (i === 0 ? [e.target.value, s.names[1]] : [s.names[0], e.target.value]) as [string, string] })}
                className="field"
              />
            </label>
          ))}
        </div>
        {pickStarters && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t("setroom.strike.starters")} <span className="font-normal text-muted">{t("setroom.strike.startersHint")}</span></legend>
            <div className="flex flex-wrap gap-2">
              {allStages.map((st) => {
                const on = rules.starters.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setS({ ...s, starters: on ? rules.starters.filter((x) => x !== st) : allStages.filter((x) => x === st || rules.starters.includes(x)) })}
                    className="chip"
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        {rules.bestOfLong && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t("setroom.strike.howLong")}</legend>
            <div className="flex flex-wrap gap-2">
              {[false, true].map((long) => (
                <label key={String(long)} className="chip">
                  <input type="radio" name="length" checked={s.long === long} onChange={() => setS({ ...s, long })} className="sr-only" />
                  {t("setroom.bestOf", { n: (long ? rules.bestOfLong : rules.bestOf) ?? rules.bestOf })}
                  {long && longFrom ? ` (${longFrom})` : ""}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{t("setroom.strike.whoFirst")} <span className="font-normal text-muted">{t("setroom.strike.whoFirstHint")}</span></legend>
          <div className="flex flex-wrap gap-2">
            {([0, 1] as Side[]).map((i) => (
              <label key={i} className="chip">
                <input type="radio" name="first" checked={s.first === i} onChange={() => setS({ ...s, first: i })} className="sr-only" />
                {s.names[i] || player(i + 1)}
              </label>
            ))}
            <button type="button" onClick={() => setS({ ...s, first: (Math.random() < 0.5 ? 0 : 1) as Side })} className="btn btn-sm btn-ghost">{t("setroom.strike.flip")}</button>
          </div>
        </fieldset>
        <button
          type="button"
          disabled={rules.starters.length === 0}
          onClick={() => go({ ...s, names: [s.names[0].trim() || player(1), s.names[1].trim() || player(2)], phase: rules.starters.length > 1 ? "strike" : "report", stage: rules.starters.length === 1 ? rules.starters[0] : null })}
          className="btn btn-lg btn-primary"
        >
          {t("setroom.strike.start")}
        </button>
        <p className="text-meta text-muted">
          {t("setroom.strike.summary", {
            ruleset: rulesetName,
            bestOf,
            starters: t("setroom.strike.starterCount", { n: rules.starters.length }),
            counterpicks: rules.counterpicks.length ? t("setroom.strike.counterpickCount", { n: rules.counterpicks.length }) : "",
            order: order.map((x) => (x === s.first ? "A" : "B")).join("-") || t("setroom.strike.none"),
            bans: bans === 0 ? t("setroom.strike.noBans") : t("setroom.strike.banCount", { n: bans }),
            dsr: rules.dsr !== "none" ? t("setroom.strike.dsr", { dsr: rules.dsr }) : "",
          })}
        </p>
      </div>
    );
  } else if (s.phase === "strike") {
    const turn = order[s.struck.length];
    const left = order.slice(s.struck.length).findIndex((x) => x !== turn);
    const strikesNow = left === -1 ? order.length - s.struck.length : left;
    body = (
      <>
        <p className="text-lg">{withNode(t("setroom.strike", { name: MARK, n: strikesNow }), name(turn))}</p>
        <ul className="grid grid-cols-2 gap-2">
          {rules.starters.map((st) =>
            tile(st, {
              state: s.struck.includes(st) ? "struck" : "open",
              onClick: s.struck.includes(st)
                ? undefined
                : () => {
                    const struck = [...s.struck, st];
                    if (struck.length >= order.length) {
                      const stage = rules.starters.find((x) => !struck.includes(x)) ?? null;
                      go({ ...s, struck, stage, phase: "report" });
                    } else go({ ...s, struck });
                  },
            }),
          )}
        </ul>
      </>
    );
  } else if (s.phase === "report" || s.phase === "agree") {
    if (s.phase === "agree") {
      body = (
        <>
          <p className="text-lg">{t("setroom.strike.agreeAny")}</p>
          <ul className="grid grid-cols-2 gap-2">{allStages.map((st) => tile(st, { onClick: () => go({ ...s, stage: st, banned: [], phase: "report", agreeFrom: null }) }))}</ul>
          <button type="button" onClick={() => setS({ ...s, phase: s.agreeFrom ?? "report", agreeFrom: null })} className="btn btn-sm btn-ghost self-start">{t("common.back")}</button>
        </>
      );
    } else {
      body = (
        <>
          <div className="rounded-xl border-2 border-foreground p-4 text-center">
            <p className="text-meta uppercase tracking-wide text-muted">{t("setroom.game", { n: s.history.length + 1 })}</p>
            {s.stage && <StageDiagram name={s.stage} className="mx-auto my-1 h-20 w-40" />}
            <p className="text-2xl font-bold">{s.stage}</p>
            {s.stage && stageLayout(s.stage)?.note && <p className="text-meta text-muted">{stageLayout(s.stage)!.note}</p>}
          </div>
          <p className="text-center">{t("setroom.strike.whoWon")}</p>
          <div className="grid grid-cols-2 gap-2">
            {([0, 1] as Side[]).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => {
                  const history = [...s.history, { stage: s.stage!, winner: side }];
                  const [a, b] = score(history);
                  if (a >= need || b >= need) return go({ ...s, history, phase: "done" });
                  const nextLoser = (1 - side) as Side;
                  go({ ...s, history, banned: [], stage: null, phase: bansAllowed(rules, history, nextLoser, bestOf) > 0 ? "ban" : "pick" });
                }}
                className="btn btn-lg btn-outline"
              >
                <span className={COLORS[side]}>{s.names[side]}</span>
              </button>
            ))}
          </div>
        </>
      );
    }
  } else if (s.phase === "ban") {
    const allowed = bansAllowed(rules, s.history, loser, bestOf);
    body = (
      <>
        <p className="text-lg">{withNode(t("setroom.ban", { name: MARK, game: s.history.length, n: allowed - s.banned.length }), name(winner))}</p>
        <ul className="grid grid-cols-2 gap-2">
          {pool.map((st) =>
            tile(st, {
              state: s.banned.includes(st) ? "banned" : "open",
              onClick: s.banned.includes(st)
                ? undefined
                : () => {
                    const banned = [...s.banned, st];
                    go({ ...s, banned, phase: banned.length >= allowed ? "pick" : "ban" });
                  },
            }),
          )}
        </ul>
      </>
    );
  } else if (s.phase === "pick") {
    const open = pickable(rules, s.history, s.banned, loser);
    body = (
      <>
        <p className="text-lg">{withNode(t("setroom.pick", { name: MARK, game: s.history.length + 1 }), name(loser))}</p>
        <ul className="grid grid-cols-2 gap-2">
          {pool.map((st) =>
            tile(st, {
              state: s.banned.includes(st) ? "banned" : open.includes(st) ? "open" : "blocked",
              onClick: open.includes(st) ? () => go({ ...s, stage: st, phase: "report" }) : undefined,
            }),
          )}
        </ul>
        {rules.dsr !== "none" && <p className="text-meta text-muted">{rules.dsr === "standard" ? t("setroom.strike.dsrStandard") : t("setroom.strike.dsrModified")}</p>}
      </>
    );
  } else if (s.phase === "done") {
    const champ: Side = w0 > w1 ? 0 : 1;
    body = (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-foreground p-6 text-center">
        <p className="text-2xl font-bold"><Icon name="trophy" /> {withNode(t("setroom.wins", { name: MARK, a: Math.max(w0, w1), b: Math.min(w0, w1) }), name(champ))}</p>
        <ol className="text-sm text-muted">
          {s.history.map((g, i) => <li key={i}>{t("setroom.strike.gameResult", { n: i + 1, stage: g.stage, name: s.names[g.winner] })}</li>)}
        </ol>
        <button type="button" onClick={() => go({ ...START, names: s.names, starters: s.starters, long: s.long })} className="btn btn-md btn-primary">{t("setroom.strike.newSet")}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {header}
      {body}
      {toolbar}
    </div>
  );
}
