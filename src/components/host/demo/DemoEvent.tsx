"use client";

// A bracket anyone can try without an account: 8 players (you and 7 made-up ones), double
// elimination, best of 3. It runs on the same bracket engine and stage-striking rules as real
// events, entirely in the browser: nothing is saved or sent anywhere, and a reload starts it over.
// Two views of the same bracket: your phone as a player, and the TO's screen.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Scoreboard from "@/components/host/Scoreboard";
import StageDiagram from "@/components/strike/StageDiagram";
import Icon from "@/components/ui/Icon";
import { buildElimination, buildRoundRobin, buildSwissRound, currentSetFor, eliminationPlacements, isElimination, isFinished, knockedOut, reportResult, roundRobinStandings, swissDropped, swissProgress, swissSeeds, swissTable, type EngineSet } from "@/lib/bracketEngine";
import { swissRounds } from "@/lib/swiss";
import { applyLive, freshLive, livePhase, liveScore, recordGame, type LiveState, type PlayerSlot } from "@/lib/liveSet";
import type { StrikeRules } from "@/lib/striking";
import { scoreText } from "@/lib/brackets/score";
import { useLang, useT } from "@/lib/i18n/client";
import type { MessageKey, Values } from "@/lib/i18n/base";
import { ordinalFor } from "@/lib/i18n/ordinal";
import { localRound } from "@/lib/i18n/rounds";

type Tr = (key: MessageKey, values?: Values) => string;

const ME = "you";
/** Seed order (seed 1 first). Made-up tags, not real players; yours is "You" in the reader's language. */
const PLAYERS: [id: string, tag: string][] = [["ada", "Ada"], ["bo", "Bo"], [ME, "You"], ["dee", "Dee"], ["eli", "Eli"], ["flo", "Flo"], ["gus", "Gus"], ["hal", "Hal"]];
const TAG = new Map(PLAYERS);
/** A player's name on screen. */
const tagger = (t: Tr) => (id: string | null) => (id === ME ? t("hostsetup.demo.you") : id ? (TAG.get(id) ?? t("hostsetup.demo.player")) : "—");
const BEST_OF = 3;
/** A common Melee ruleset: 5 starters struck 1-2-1, one counterpick stage, 1 ban, no going back to the last stage you won on. */
const RULES: StrikeRules = {
  starters: ["Battlefield", "Final Destination", "Yoshi's Story", "Fountain of Dreams", "Pokémon Stadium"],
  counterpicks: ["Dream Land N64"],
  pattern: "1-2-1",
  bans: 1,
  dsr: "modified",
  bestOf: BEST_OF,
};
const POOL = [...RULES.starters, ...RULES.counterpicks];
/** The first set's coin flip is fixed (you strike first), so the page draws the same on the server and in the browser. */
const FIRST_FLIP: LiveState = freshLive(() => 0);

/** `order` is the seeding the bracket was built from (seed 1 first). */
/**
 * Double elimination, a round robin (one pool: everyone plays everyone), or Swiss (the usual number
 * of rounds, each paired by record). In the last two the standings decide the places.
 */
type Format = "double" | "rr" | "sw";
type Demo = { sets: EngineSet[]; live: Record<string, LiveState>; order: string[]; format: Format };

function startDemo(order: string[] = PLAYERS.map(([id]) => id), format: Format = "double"): Demo {
  const sets =
    format === "rr"
      ? buildRoundRobin(order, { bestOf: BEST_OF })
      : format === "sw"
        ? buildSwissRound(order.map((id, i) => ({ id, seed: i + 1 })), [], { bestOf: BEST_OF })
        : buildElimination(order, { double: true, bestOf: BEST_OF });
  return { sets, live: {}, order, format };
}

/**
 * Swiss: once every set of a round has a result, pair the next one (a real event waits for the TO's
 * "Start round N"). Nothing to add after the last round.
 */
function nextSwissRound(sets: EngineSet[]): EngineSet[] {
  if (!swissProgress(sets).complete || isFinished(sets)) return sets;
  const dropped = swissDropped(sets);
  return [...sets, ...buildSwissRound(swissSeeds(sets).filter((p) => !dropped.has(p.id)), sets, { bestOf: BEST_OF })];
}

/** Record a set's result in the bracket; if that puts you in a new set, flip its coin. */
function record(d: Demo, key: string, winner: PlayerSlot, score: [number, number]): Demo {
  const changed = reportResult(d.sets, key, winner, score);
  const byKey = new Map(d.sets.map((s) => [s.key, s]));
  for (const c of changed) byKey.set(c.key, c);
  const sets = d.format === "sw" ? nextSwissRound([...byKey.values()]) : [...byKey.values()];
  const live = { ...d.live };
  delete live[key];
  const mine = currentSetFor(sets, ME);
  if (mine && !live[mine.key]) live[mine.key] = freshLive();
  return { sets, live, order: d.order, format: d.format };
}

/** Play other people's sets (the better seed usually wins). `untilMine`: stop as soon as you have a set to play. */
function simulate(d: Demo, untilMine: boolean): Demo {
  let cur = d;
  for (let guard = 0; guard < 40 && !isFinished(cur.sets); guard++) {
    if (untilMine && currentSetFor(cur.sets, ME)) break;
    const next = cur.sets.find((s) => s.state === "ready" && !(untilMine && s.p.some((p) => p.id === ME)));
    if (!next) break;
    const seed = (id: string | null) => (id ? cur.order.indexOf(id) : 99);
    const better: PlayerSlot = seed(next.p[0].id) < seed(next.p[1].id) ? 1 : 2;
    const winner: PlayerSlot = Math.random() < 0.7 ? better : better === 1 ? 2 : 1;
    const loserGames = Math.random() < 0.5 ? 1 : 0;
    cur = record(cur, next.key, winner, winner === 1 ? [2, loserGames] : [loserGames, 2]);
  }
  return cur;
}

/** Your set right now: which slot you are, its live state, and what happens next in it. */
function mySet(d: Demo, tag: (id: string | null) => string) {
  const set = currentSetFor(d.sets, ME);
  if (!set) return null;
  const slot: PlayerSlot = set.p[0].id === ME ? 1 : 2;
  const live = d.live[set.key] ?? FIRST_FLIP;
  return { set, slot, them: (slot === 1 ? 2 : 1) as PlayerSlot, live, phase: livePhase(RULES, BEST_OF, live), opponent: tag(set.p[slot === 1 ? 1 : 0].id) };
}

export default function DemoEvent() {
  const t = useT();
  const lang = useLang();
  const tag = useMemo(() => tagger(t), [t]);
  const [demo, setDemo] = useState<Demo>(() => startDemo());
  const [format, setFormat] = useState<Format>("double");
  const [view, setView] = useState<"player" | "to" | "setup">("player");
  // The TO's screen before the bracket starts: who is here (checked in) and in what order (seeding).
  const [lineup, setLineup] = useState(() => PLAYERS.map(([id]) => ({ id, here: true })));
  const here = lineup.filter((p) => p.here);
  const moveSeed = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= lineup.length) return;
    const next = [...lineup];
    [next[i], next[j]] = [next[j], next[i]];
    setLineup(next);
  };
  const setupView = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {t("hostsetup.demo.setupIntro")}
      </p>
      <ol className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {lineup.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <span className="w-5 text-right font-mono tabular-nums text-muted">{i + 1}</span>
            <span className={`min-w-0 flex-1 truncate ${p.here ? "" : "text-muted line-through"} ${p.id === ME ? "font-semibold text-brand" : ""}`}>{tag(p.id)}</span>
            <button
              type="button"
              disabled={p.id === ME}
              aria-pressed={p.here}
              onClick={() => setLineup(lineup.map((x) => (x.id === p.id ? { ...x, here: !x.here } : x)))}
              className="btn btn-sm btn-ghost px-2 text-meta"
              title={p.id === ME ? t("hostsetup.demo.thatsYou") : undefined}
            >
              {p.here ? t("hostsetup.demo.checkedIn") : t("hostsetup.demo.notHere")}
            </button>
            <button type="button" onClick={() => moveSeed(i, -1)} disabled={i === 0} className="btn btn-sm btn-ghost px-2" aria-label={t("hostsetup.demo.moveUp", { tag: tag(p.id) })}>↑</button>
            <button type="button" onClick={() => moveSeed(i, 1)} disabled={i === lineup.length - 1} className="btn btn-sm btn-ghost px-2" aria-label={t("hostsetup.demo.moveDown", { tag: tag(p.id) })}>↓</button>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("hostsetup.demo.format")}>
          <span className="text-sm font-semibold">{t("hostsetup.demo.format")}</span>
          {(["double", "rr", "sw"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)} className={`btn btn-sm ${format === f ? "btn-primary" : "btn-outline"}`}>
              {t(f === "rr" ? "hostsetup.demo.formatRR" : f === "sw" ? "hostsetup.demo.formatSwiss" : "hostsetup.demo.formatDouble")}
            </button>
          ))}
        </div>
        {format === "rr" && <p className="text-meta text-muted">{t("hostsetup.demo.formatRRHint")}</p>}
        {format === "sw" && <p className="text-meta text-muted">{t("hostsetup.demo.formatSwissHint", { n: swissRounds(here.length) })}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={here.length < 2}
          onClick={() => {
            setDemo(startDemo(here.map((p) => p.id), format));
            setView("to");
          }}
          className="btn btn-md btn-primary"
        >
          {t("hostsetup.demo.start", { n: here.length })}
        </button>
        <span className="text-meta text-muted">{t("hostsetup.demo.startAgain")}</span>
      </div>
      <p className="text-meta text-muted">{t("hostsetup.demo.realSeeding")}</p>
    </div>
  );
  const { sets } = demo;
  const mine = mySet(demo, tag);
  const finished = isFinished(sets);
  // Elimination: you were knocked out. Round robin: nobody is; you're done once all your sets are played.
  // Swiss: you play every round, so you're only done when the event is.
  const out =
    demo.format === "rr" ? !sets.some((s) => s.state !== "done" && s.p.some((p) => p.id === ME)) : demo.format === "sw" ? false : sets.some((s) => knockedOut(sets, s) === ME);

  // The made-up opponent takes their turns (a strike, ban or pick) a moment after yours.
  useEffect(() => {
    const m = mySet(demo, tag);
    if (!m || (m.phase.kind !== "strike" && m.phase.kind !== "ban" && m.phase.kind !== "pick") || m.phase.turn !== m.them) return;
    const { kind, options } = m.phase;
    const timer = setTimeout(() => {
      const stage = options[Math.floor(Math.random() * options.length)];
      try {
        const next = applyLive(RULES, BEST_OF, m.live, m.them, { type: kind, stage });
        setDemo((d) => ({ ...d, live: { ...d.live, [m.set.key]: next } }));
      } catch {
        // the set moved on while the timer was waiting: nothing to do
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [demo, tag]);

  /** Your own strike, ban or pick. */
  const move = (type: "strike" | "ban" | "pick", stage: string) => {
    if (!mine) return;
    try {
      const next = applyLive(RULES, BEST_OF, mine.live, mine.slot, { type, stage });
      setDemo({ ...demo, live: { ...demo.live, [mine.set.key]: next } });
    } catch {
      // not your turn or not a legal stage: the buttons already prevent this
    }
  };
  /** A game is over. In a real event your opponent confirms on their phone; here they always agree. */
  const game = (winner: PlayerSlot) => {
    if (!mine || mine.phase.kind !== "play") return;
    const next = recordGame(mine.live, mine.phase.stage, winner);
    const after = livePhase(RULES, BEST_OF, next);
    setDemo(after.kind === "done" ? record(demo, mine.set.key, after.winner, liveScore(next)) : { ...demo, live: { ...demo.live, [mine.set.key]: next } });
  };

  const tiles = (options: string[], onPick: ((stage: string) => void) | null, marked: string[], all = POOL) => (
    <ul className="grid grid-cols-2 gap-2">
      {all.map((st) => {
        const gone = marked.includes(st);
        const can = !!onPick && options.includes(st);
        return (
          <li key={st}>
            <button
              type="button"
              disabled={!can}
              onClick={() => onPick?.(st)}
              className={`relative flex w-full flex-col items-center gap-1 rounded-xl border-2 px-2 pt-2 pb-2.5 text-center font-semibold transition ${
                gone ? "border-line text-muted opacity-60" : can ? "border-line-strong hover:bg-surface active:scale-[0.98]" : "border-line opacity-70"
              }`}
            >
              <StageDiagram name={st} className="h-14 w-28" />
              <span className="leading-tight">{st}</span>
              {gone && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-5xl font-black text-danger/70">✕</span>}
              {gone && <span className="sr-only">{t("hostsetup.demo.gone")}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const placements = !finished ? [] : (standingsOf(sets) ?? eliminationPlacements(sets));
  // A round robin can end with two players level on everything: they share 1st, and the result says so.
  const firsts = placements.filter((p) => p.place === 1);
  const results = finished && (
    <div className="flex flex-col gap-2">
      <p className="rounded-xl border-2 border-foreground p-4 text-center text-xl font-bold">
        <Icon name="trophy" />{" "}
        {firsts.length > 1
          ? t("hostsetup.demo.shareFirst", { tags: firsts.map((p) => tag(p.id)).join(" & ") })
          : firsts[0]?.id === ME
            ? t("hostsetup.demo.youWin")
            : t("hostsetup.demo.wins", { tag: tag(firsts[0]?.id ?? null) })}
      </p>
      <ol className="grid grid-cols-2 gap-x-4 text-sm">
        {placements.map((p) => (
          <li key={p.id} className={p.id === ME ? "font-bold text-brand" : ""}>{ordinalFor(lang, p.place)} · {tag(p.id)}</li>
        ))}
      </ol>
      <p className="text-meta text-muted">{t("hostsetup.demo.realPlacement")}</p>
      <button type="button" onClick={() => setDemo(startDemo(PLAYERS.map(([id]) => id), demo.format))} className="btn btn-md btn-outline self-start">{t("hostsetup.demo.startOver")}</button>
    </div>
  );

  let phone: React.ReactNode;
  if (finished) {
    phone = results;
  } else if (!mine) {
    phone = (
      <div className="flex flex-col items-start gap-2">
        {out ? (
          demo.format === "rr" ? (
            <p><b>{t("hostsetup.demo.doneTitle")}</b> {t("hostsetup.demo.doneText")}</p>
          ) : (
            <p><b>{t("hostsetup.demo.outTitle")}</b> {t("hostsetup.demo.outText")}</p>
          )
        ) : (
          <p><b>{t("hostsetup.demo.waitTitle")}</b> {t("hostsetup.demo.waitText")}</p>
        )}
        <button type="button" onClick={() => setDemo(simulate(demo, !out))} className="btn btn-md btn-primary">{out ? t("hostsetup.demo.playOut") : t("hostsetup.demo.skipAhead")}</button>
      </div>
    );
  } else {
    const { phase, live, slot, them, opponent } = mine;
    const [a, b] = liveScore(live);
    const who = (p: PlayerSlot) => (p === slot ? t("hostsetup.demo.you") : opponent);
    const waiting = (p: PlayerSlot) => (p === them ? t("hostsetup.demo.waiting") : "");
    let body: React.ReactNode;
    if (phase.kind === "strike") {
      body = (
        <>
          {live.struck.length === 0 && <p className="text-sm text-muted">{live.first === slot ? t("hostsetup.demo.coinYou") : t("hostsetup.demo.coinThem", { who: opponent })}</p>}
          <p className="text-lg"><b>{who(phase.turn)}</b>: {t("hostsetup.demo.strike", { n: phase.count })}{waiting(phase.turn)}</p>
          {tiles(phase.options, phase.turn === slot ? (st) => move("strike", st) : null, live.struck, RULES.starters)}
        </>
      );
    } else if (phase.kind === "ban") {
      body = (
        <>
          <p className="text-lg"><b>{who(phase.turn)}</b>{lang === "ja" ? "" : " "}{t("hostsetup.demo.ban", { n: phase.count, game: live.games.length })}{waiting(phase.turn)}</p>
          {tiles(phase.options, phase.turn === slot ? (st) => move("ban", st) : null, live.banned)}
        </>
      );
    } else if (phase.kind === "pick") {
      body = (
        <>
          <p className="text-lg"><b>{who(phase.turn)}</b>: {t("hostsetup.demo.pick", { n: live.games.length + 1 })}{waiting(phase.turn)}</p>
          {tiles(phase.options, phase.turn === slot ? (st) => move("pick", st) : null, live.banned)}
          <p className="text-meta text-muted">{t("hostsetup.demo.greyed")}</p>
        </>
      );
    } else if (phase.kind === "play") {
      body = (
        <>
          <div className="rounded-xl border-2 border-foreground p-4 text-center">
            <p className="text-meta uppercase tracking-wide text-muted">{t("hostsetup.demo.game", { n: phase.game })}</p>
            <StageDiagram name={phase.stage} className="mx-auto my-1 h-20 w-40" />
            <p className="text-2xl font-bold">{phase.stage}</p>
          </div>
          <p className="text-center">{t("hostsetup.demo.playThen")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => game(slot)} className="btn btn-lg btn-outline">{t("hostsetup.demo.iWon")}</button>
            <button type="button" onClick={() => game(them)} className="btn btn-lg btn-outline">{t("hostsetup.demo.theyWon", { tag: opponent })}</button>
          </div>
          <p className="text-meta text-muted">{t("hostsetup.demo.confirm", { tag: opponent })}</p>
        </>
      );
    } else {
      body = null;
    }
    phone = (
      <>
        <Scoreboard label={t("hostsetup.demo.setLabel", { id: mine.set.identifier ?? "", n: BEST_OF })} status="live" left={{ name: <span className="text-brand">{t("hostsetup.demo.you")}</span>, score: slot === 1 ? a : b }} right={{ name: opponent, score: slot === 1 ? b : a }} />
        {body}
      </>
    );
  }

  const open = sets.filter((s) => s.state === "ready");
  const result = (s: EngineSet, winner: PlayerSlot, loserGames: number) => () => setDemo(record(demo, s.key, winner, winner === 1 ? [2, loserGames] : [loserGames, 2]));
  const desk = finished ? (
    results
  ) : (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("hostsetup.demo.deskIntro")}</p>
      <ul className="flex flex-col gap-2">
        {open.map((s, i) => (
          <li key={s.key} className="card flex flex-col gap-2 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold">{t("hostsetup.demo.setVs", { id: s.identifier ?? "", a: tag(s.p[0].id), b: tag(s.p[1].id) })}</span>
              <span className="text-meta text-muted">{t("hostsetup.demo.setup", { n: i + 1 })}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {([1, 2] as const).map((w) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-muted">{tag(s.p[w - 1].id)}</span>
                  <button type="button" onClick={result(s, w, 0)} className="btn btn-sm btn-outline" aria-label={t("hostsetup.demo.wonBy", { tag: tag(s.p[w - 1].id), n: 0 })}>2–0</button>
                  <button type="button" onClick={result(s, w, 1)} className="btn btn-sm btn-outline" aria-label={t("hostsetup.demo.wonBy", { tag: tag(s.p[w - 1].id), n: 1 })}>2–1</button>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setDemo(simulate(demo, false))} className="btn btn-md btn-ghost self-start">{t("hostsetup.demo.playOut")}</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("hostsetup.demo.chooseView")}>
        <button type="button" aria-pressed={view === "player"} onClick={() => setView("player")} className={`btn btn-md ${view === "player" ? "btn-primary" : "btn-outline"}`}><Icon name="phone" /> {t("hostsetup.demo.phone")}</button>
        <button type="button" aria-pressed={view === "to"} onClick={() => setView("to")} className={`btn btn-md ${view === "to" ? "btn-primary" : "btn-outline"}`}><Icon name="clipboard" /> {t("hostsetup.demo.toScreen")}</button>
        <button type="button" aria-pressed={view === "setup"} onClick={() => setView("setup")} className={`btn btn-md ${view === "setup" ? "btn-primary" : "btn-outline"}`}><Icon name="user" /> {t("hostsetup.demo.signups")}</button>
      </div>

      <section aria-live="polite" aria-label={view === "player" ? t("hostsetup.demo.yourSet") : view === "to" ? t("hostsetup.demo.beingPlayed") : t("hostsetup.demo.signups")} className="card flex flex-col gap-3 p-4">
        {view === "player" ? phone : view === "to" ? desk : setupView}
      </section>

      {demo.format === "double" ? <Board sets={sets} t={t} tag={tag} /> : <RoundRobinBoard sets={sets} t={t} tag={tag} />}

      <div className="flex flex-wrap gap-2">
        <Link href="/host/new" className="btn btn-md btn-primary">{t("hostsetup.demo.hostReal")}</Link>
        <Link href="/host/about" className="btn btn-md btn-ghost">{t("hostsetup.demo.howHosting")}</Link>
      </div>
    </div>
  );
}

/** The bracket: winners side, losers side and the grand final, updating as results come in. */
function Board({ sets, t, tag }: { sets: EngineSet[]; t: Tr; tag: (id: string | null) => string }) {
  const shown = sets.filter((s) => s.state !== "bye" && !(s.bracket === "GF2" && s.state === "skipped"));
  const rounds = (side: "W" | "L") => {
    const list = shown.filter((s) => s.bracket === side);
    const last = Math.max(0, ...list.map((s) => s.round));
    return [...new Set(list.map((s) => s.round))]
      .sort((x, y) => x - y)
      .map((r) => ({
        label: localRound(side === "W" ? (r === last ? "Winners Final" : r === last - 1 ? "Winners Semi-Final" : `Winners Round ${r}`) : r === last ? "Losers Final" : `Losers Round ${r}`, t),
        sets: list.filter((s) => s.round === r).sort((x, y) => x.idx - y.idx),
      }));
  };
  const finals = shown.filter((s) => s.bracket === "GF" || s.bracket === "GF2");
  const columns = (title: string, cols: { label: string; sets: EngineSet[] }[]) => (
    <div>
      <h3 className="mb-1 text-meta font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cols.map((c) => (
          <div key={c.label} className="flex shrink-0 flex-col gap-2">
            <p className="text-meta text-muted">{c.label}</p>
            {c.sets.map((s) => (
              <div key={s.key} className={`w-36 rounded-xl border bg-panel px-2 py-1 text-sm shadow-[inset_0_1px_0_var(--glass-highlight),var(--glass-shadow)] ${s.state === "ready" ? "border-brand" : "border-[var(--glass-line)]"}`}>
                <p className="flex justify-between text-meta text-muted">
                  <span>{s.identifier}</span>
                  <span>{s.state === "ready" ? t("hostsetup.demo.upNext") : s.state === "done" ? "" : t("hostsetup.demo.waitingShort")}</span>
                </p>
                {([0, 1] as const).map((i) => {
                  const won = s.state === "done" && s.winner === i + 1;
                  return (
                    <p key={i} className={`flex justify-between gap-2 ${won ? "font-bold" : s.state === "done" ? "text-muted" : ""}`}>
                      <span className={`truncate ${s.p[i].id === ME ? "text-brand" : ""}`}>{tag(s.p[i].id)}</span>
                      <span className={`min-w-5 rounded px-1 text-center tabular-nums ${won ? "bg-[#e8301f] bg-[image:var(--jelly-red)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.55)]" : ""}`}>{scoreText(s.score[i], s.score[1 - i])}</span>
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section aria-label={t("hostsetup.demo.bracket")} className="flex flex-col gap-3">
      <h2 className="font-bold">{t("hostsetup.demo.theBracket")}</h2>
      {columns(t("hostsetup.demo.winnersSide"), [...rounds("W"), { label: t("hostbracket.round.grandFinal"), sets: finals }])}
      {columns(t("hostsetup.demo.losersSide"), rounds("L"))}
    </section>
  );
}

/** A round robin's or Swiss's standings with records; null for an elimination bracket. */
function standingsOf(sets: EngineSet[]): { id: string; place: number; wins: number; losses: number }[] | null {
  if (sets.some((s) => s.bracket === "SW")) return swissTable(sets).map((r) => ({ id: r.id, place: r.rank, wins: r.wins, losses: r.losses }));
  if (sets.some((s) => s.bracket === "RR")) return roundRobinStandings(sets);
  return null;
}

/** A round robin or Swiss: the standings, then every set round by round. */
function RoundRobinBoard({ sets, t, tag }: { sets: EngineSet[]; t: Tr; tag: (id: string | null) => string }) {
  const table = standingsOf(sets) ?? [];
  const rr = sets.filter((s) => !isElimination(s) && s.state !== "bye" && s.p[0].id && s.p[1].id);
  const rounds = [...new Set(rr.map((s) => s.round))].sort((x, y) => x - y);
  return (
    <section aria-label={t("hostsetup.demo.bracket")} className="flex flex-col gap-3">
      <h2 className="font-bold">{t("hostsetup.demo.theBracket")}</h2>
      <div>
        <h3 className="mb-1 text-meta font-semibold uppercase tracking-wide text-muted">{t("hostsetup.demo.standings")}</h3>
        <table className="w-full max-w-sm text-sm">
          <thead className="sr-only">
            <tr><th>#</th><th>{t("hostsetup.demo.standings")}</th><th>{t("hostsetup.demo.record")}</th></tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="w-8 py-1 font-mono tabular-nums text-muted">{r.place}</td>
                <td className={`py-1 ${r.id === ME ? "font-semibold text-brand" : ""}`}>{tag(r.id)}</td>
                <td className="py-1 text-right font-mono tabular-nums">{r.wins}–{r.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="mb-1 text-meta font-semibold uppercase tracking-wide text-muted">{t("hostsetup.demo.rounds")}</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {rounds.map((r) => (
            <div key={r} className="flex shrink-0 flex-col gap-2">
              <p className="text-meta text-muted">{t("hostbracket.round.round", { n: r })}</p>
              {rr.filter((s) => s.round === r).sort((x, y) => x.idx - y.idx).map((s) => (
                <div key={s.key} className={`w-36 rounded-xl border bg-panel px-2 py-1 text-sm shadow-[inset_0_1px_0_var(--glass-highlight),var(--glass-shadow)] ${s.state === "ready" ? "border-brand" : "border-[var(--glass-line)]"}`}>
                  {([0, 1] as const).map((i) => {
                    const won = s.state === "done" && s.winner === i + 1;
                    return (
                      <p key={i} className={`flex justify-between gap-2 ${won ? "font-bold" : s.state === "done" ? "text-muted" : ""}`}>
                        <span className={`truncate ${s.p[i].id === ME ? "text-brand" : ""}`}>{tag(s.p[i].id)}</span>
                        <span className={`min-w-5 rounded px-1 text-center tabular-nums ${won ? "bg-[#e8301f] bg-[image:var(--jelly-red)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.55)]" : ""}`}>{scoreText(s.score[i], s.score[1 - i])}</span>
                      </p>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
