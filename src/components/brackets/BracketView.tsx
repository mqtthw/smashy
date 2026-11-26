"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import DragScroll from "./DragScroll";
import Icon from "@/components/ui/Icon";
import { useRouter } from "next/navigation";
import { useStoredState } from "@/lib/useStoredState";
import { scoreText } from "@/lib/brackets/score";
import { upsetFactor } from "@/lib/brackets/upset";
import { bracketPath, setPath, type Bracket, type BracketRound, type BracketSet, type BracketSource, type SetPlayer } from "@/lib/brackets/types";
import { useT } from "@/lib/i18n/client";
import { localRound } from "@/lib/i18n/rounds";
import { findPlayerInEvent } from "@/app/brackets/actions";
import { projectBracket, type Projection } from "@/lib/brackets/projected";

type Tr = ReturnType<typeof useT>;

// Linkable sets have a real id (start.gg numbers, parry.gg UUIDs); unstarted start.gg previews don't.
const linkable = (id: string) => /^\d+$/.test(id) || /^[0-9a-f-]{36}$/i.test(id);

/** What a screen reader says for a set's box (lib/brackets/setLabel.ts, in the visitor's language). */
function setAria(s: BracketSet, t: Tr): string {
  const [a, b] = s.players;
  const name = (p: SetPlayer | null, i: 0 | 1) => p?.name ?? (s.waitingOn[i] ? localRound(s.waitingOn[i]!, t) : t("hostbracket.view.ariaTbd"));
  const round = localRound(s.roundLabel, t);
  const where = s.identifier ? t("hostbracket.view.ariaWhere", { round, id: s.identifier }) : round;
  let state = s.state === "live" ? t("hostbracket.view.ariaLive") : t("hostbracket.view.ariaNotPlayed");
  if (s.state === "done" && a && b) {
    const [winner, loser] = a.won ? [a, b] : [b, a];
    const score = [scoreText(winner.score, loser.score), scoreText(loser.score, winner.score)];
    state =
      loser.score === -1
        ? t("hostbracket.view.ariaWonDq", { name: winner.name })
        : score[0] && score[1]
          ? t("hostbracket.view.ariaWonScore", { name: winner.name, w: score[0], l: score[1] })
          : t("hostbracket.view.ariaWon", { name: winner.name });
  }
  return t("hostbracket.view.aria", { where, a: name(a, 0), b: name(b, 1), state });
}

function PlayerRow({ p, waiting, done, highlight, otherScore = null, projected = null }: { p: SetPlayer | null; waiting: string | null; done: boolean; highlight: boolean; otherScore?: number | null; projected?: SetPlayer | null }) {
  const t = useT();
  if (!p && projected) {
    // The projected bracket: who the seeds say gets here (greyed and slanted, so it never reads as real).
    return (
      <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 italic text-muted ${highlight ? "bg-brand/10" : ""}`} title={t("hostbracket.view.projectedHint")}>
        <span className="flex min-w-0 items-baseline gap-1.5">
          {projected.seed !== null && <span className="w-5 shrink-0 text-right font-mono text-[11px] not-italic">{projected.seed}</span>}
          <span className="truncate">{projected.name}</span>
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide not-italic">{t("hostbracket.view.projectedTag")}</span>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-meta italic text-muted">
        <span className="truncate">{waiting ? localRound(waiting, t) : t("event.tbd")}</span>
      </div>
    );
  }
  const lost = done && !p.won;
  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 ${highlight ? "bg-brand/10" : ""}`}>
      <span className={`flex min-w-0 items-baseline gap-1.5 ${lost ? "text-muted" : ""}`}>
        {p.seed !== null && <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted">{p.seed}</span>}
        <span className={`truncate ${p.won ? "font-bold" : ""}`}>
          {p.prefix && <span className="font-normal text-muted">{p.prefix} </span>}
          {p.name}
        </span>
      </span>
      {/* Scoreboard-style: once it's over, each score sits in a box and the winner's is filled. Only
          where there is a score to show (some start.gg sets record a winner without one). */}
      <span
        className={`min-w-7 shrink-0 rounded-md px-1 text-center font-mono text-meta leading-5 tabular-nums [print-color-adjust:exact] ${
          p.score === null ? "" : !done ? "font-semibold" : p.won ? "bg-[#d4231a] font-bold text-white" : "bg-surface-2 text-muted"
        }`}
      >
        {scoreText(p.score, otherScore)}
      </span>
    </div>
  );
}

function SetCard({ s, source, query, dim = false, found = false, proj = null }: { s: BracketSet; source: BracketSource; query: string; dim?: boolean; found?: boolean; proj?: Projection | null }) {
  const t = useT();
  const hit = (p: SetPlayer | null) => !!query && !!p && `${p.prefix ?? ""} ${p.name}`.toLowerCase().includes(query);
  const shown = s.state === "pending" ? proj?.get(s.id) ?? null : null;
  // A lower seed beat a higher one (not by DQ): how many placement groups apart they were seeded.
  const [a, b] = s.players;
  const winner = a?.won ? a : b?.won ? b : null;
  const loser = winner === a ? b : a;
  const upset = s.state === "done" && winner && loser && a?.score !== -1 && b?.score !== -1 ? upsetFactor(winner.seed, loser.seed) : 0;
  const body = (
    <div
      data-hit={found ? "" : undefined}
      data-open={found && s.state !== "done" ? "" : undefined}
      className={`w-full overflow-hidden rounded-xl border bg-panel text-body ${s.state === "live" || found ? "border-brand" : "border-line"} ${found ? "ring-2 ring-brand/40" : ""} ${dim ? "opacity-30" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-line bg-surface px-2.5 py-0.5 text-[11px] text-muted">
        <span>{s.identifier ? t("hostbracket.view.set", { id: s.identifier }) : localRound(s.roundLabel, t)}</span>
        {s.reported ? <span className="font-semibold text-brand" title={t("hostbracket.view.reportedHint")}><Icon name="clipboard" /> {t("hostbracket.view.reported")}</span> : s.state === "live" ? <span className="font-bold text-brand">{t("hostbracket.view.live")}</span> : s.state === "done" ? (upset > 0 ? <span className="font-semibold text-foreground" title={t("hostbracket.view.upsetHint", { winner: winner!.seed ?? "", loser: loser!.seed ?? "" })}>{t("hostbracket.view.upset", { n: upset })}</span> : <span>{t("hostbracket.view.final")}</span>) : s.setup ? <span className="font-semibold text-foreground"><Icon name="pin" /> {s.setup}</span> : null}
      </div>
      <PlayerRow p={s.players[0]} waiting={s.waitingOn[0]} done={s.state === "done"} highlight={hit(s.players[0]) || hit(shown?.[0] ?? null)} otherScore={s.players[1]?.score} projected={shown?.[0] ?? null} />
      <div className="border-t border-line" />
      <PlayerRow p={s.players[1]} waiting={s.waitingOn[1]} done={s.state === "done"} highlight={hit(s.players[1]) || hit(shown?.[1] ?? null)} otherScore={s.players[0]?.score} projected={shown?.[1] ?? null} />
    </div>
  );
  return linkable(s.id) && (s.players[0] || s.players[1]) ? (
    <Link href={setPath(source, s.id)} className="block w-full transition-opacity hover:opacity-80" aria-label={setAria(s, t)}>
      {body}
    </Link>
  ) : (
    body
  );
}

function matches(s: BracketSet, query: string, proj: Projection | null = null) {
  if (!query) return true;
  const shown = s.state === "pending" ? proj?.get(s.id) : undefined;
  return [...s.players, ...(shown ?? [])].some((p) => p && `${p.prefix ?? ""} ${p.name}`.toLowerCase().includes(query));
}

function RoundsList({ rounds, source, query, proj = null }: { rounds: BracketRound[]; source: BracketSource; query: string; proj?: Projection | null }) {
  const t = useT();
  const shown = rounds.map((r) => ({ ...r, sets: r.sets.filter((s) => matches(s, query, proj)) })).filter((r) => r.sets.length);
  if (!shown.length) return <p className="p-6 text-center text-muted">{query ? t("hostbracket.view.noneWithPlayer") : t("hostbracket.view.noSets")}</p>;
  return (
    <div className="flex flex-col">
      {!query && (
        <nav aria-label={t("hostbracket.view.jump")} className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2">
          {shown.map((r) => (
            <a key={r.key} href={`#round-${r.key}`} className="chip shrink-0 py-1 text-meta">{localRound(r.label, t)}</a>
          ))}
        </nav>
      )}
      {shown.map((r) => (
        <section key={r.key} id={`round-${r.key}`} className="flex scroll-mt-28 flex-col gap-2 border-b border-line px-4 py-3">
          <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{localRound(r.label, t)}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {r.sets.map((s) => <SetCard key={s.id} s={s} source={source} query={query} proj={proj} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tree({ rounds, source, query, title, top8, proj = null }: { rounds: BracketRound[]; source: BracketSource; query: string; title: string | null; top8: string | null; proj?: Projection | null }) {
  const t = useT();
  if (!rounds.length) return null;
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="sticky left-0 w-fit text-meta font-semibold uppercase tracking-wide text-muted">{title}</h3>}
      <div>
        <div className="flex min-w-max items-stretch gap-4">
          {rounds.map((r) => (
            <div key={r.key} className="flex w-56 flex-col" data-top8={r.key === top8 ? "" : undefined}>
              <p className="mb-2 truncate text-center text-meta font-semibold text-muted">{localRound(r.label, t)}</p>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {r.sets.map((s) => <SetCard key={s.id} s={s} source={source} query={query} dim={!!query && !matches(s, query, proj)} found={!!query && matches(s, query, proj)} proj={proj} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * A live bracket's "Live now" and "Up next": the sets being played, then the ones ready to start (both
 * players known), earliest rounds first. So someone watching doesn't have to hunt through the tree.
 */
function LiveStrip({ rounds, source }: { rounds: BracketRound[]; source: BracketSource }) {
  const t = useT();
  const all = rounds.flatMap((r) => r.sets);
  const live = all.filter((s) => s.state === "live");
  const next = all
    .filter((s) => s.state === "pending" && s.players[0] && s.players[1])
    .sort((a, b) => Math.abs(a.round) - Math.abs(b.round) || Number(b.winnersSide) - Number(a.winnersSide))
    .slice(0, 6);
  if (!live.length && !next.length) return null;
  const row = (title: string, sets: BracketSet[]) =>
    sets.length > 0 && (
      <div className="flex flex-col gap-1.5">
        <h3 className="flex items-center gap-1.5 px-4 text-meta font-semibold uppercase tracking-wide text-muted">{title} <span className="font-normal normal-case">· {sets.length}</span></h3>
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:thin]">
          {sets.map((s) => (
            <div key={s.id} className="w-60 shrink-0">
              <SetCard s={s} source={source} query="" />
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <section aria-label={t("hostbracket.view.liveStrip")} className="flex flex-col gap-3 border-b border-line py-3 print:hidden">
      {row(t("hostbracket.view.liveNow"), live)}
      {row(t("hostbracket.view.upNext"), next)}
    </section>
  );
}

/**
 * Refreshes the page every 30 seconds until the bracket is finished, while the tab is visible. Only
 * for brackets read from another site (start.gg, parry.gg): we can't hear their changes. A bracket
 * hosted on Smashy has live updates (BracketLive) and reloads only when something changed.
 */
function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

/**
 * "Find a player" found nobody in this pool (round 456): ask start.gg which pool of the event they're
 * in, and offer it (Zain was in Top 132 Pool I1 while the page showed Pool H1).
 */
function ElsewhereInEvent({ bracket, query }: { bracket: Bracket; query: string }) {
  const t = useT();
  const [found, setFound] = useState<{ q: string; hits: { tag: string; groupId: string }[] } | null>(null);
  useEffect(() => {
    let stale = false;
    const timer = setTimeout(() => {
      findPlayerInEvent(bracket.event.eventId, query)
        .then((hits) => !stale && setFound({ q: query, hits }))
        .catch(() => !stale && setFound({ q: query, hits: [] }));
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [bracket.event.eventId, query]);
  const label = (id: string) => bracket.event.groups.find((g) => g.id === id)?.label ?? null;
  const hits = found?.q === query ? found.hits.filter((h) => h.groupId !== bracket.groupId && label(h.groupId)) : null;
  if (hits === null) return <p className="px-4 pt-3 text-meta text-muted">{t("hostbracket.view.lookingElsewhere")}</p>;
  if (!hits.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
      <span className="text-meta text-muted">{t("hostbracket.view.elsewhere")}</span>
      {hits.map((h) => (
        <Link key={h.groupId + h.tag} href={`${bracketPath(bracket.event.source, bracket.event.eventId, h.groupId)}&q=${encodeURIComponent(h.tag)}`} className="btn btn-sm btn-outline">
          {t("hostbracket.view.elsewhereIn", { tag: h.tag, pool: label(h.groupId)! })}
        </Link>
      ))}
    </div>
  );
}

export default function BracketView({
  bracket,
  initialQuery = "",
  myName = null,
  myHref = null,
  top8Href = null,
}: {
  bracket: Bracket;
  initialQuery?: string;
  myName?: string | null;
  myHref?: string | null; // their sets are in another pool: "My sets" goes there
  top8Href?: string | null; // Top 8 is played in another pool: "Top 8" goes there
}) {
  const t = useT();
  const [view, setView] = useStoredState("smashy-bracket-view", "rounds");
  // The projected bracket (round 452): off until someone turns it on; remembered on this device.
  const [projectedPref, setProjectedPref] = useStoredState("smashy-bracket-projected", "off");
  const canProject = !bracket.finished && bracket.type !== "round_robin" && bracket.type !== "swiss";
  const projectedOn = canProject && projectedPref === "on";
  const proj = useMemo(() => (projectedOn ? projectBracket(bracket) : null), [projectedOn, bracket]);
  const [raw, setRaw] = useState(initialQuery);
  const query = raw.trim().toLowerCase();
  const source = bracket.event.source;
  const elimination = bracket.type === "double" || bracket.type === "single";
  const winners = useMemo(() => bracket.rounds.filter((r) => r.winnersSide), [bracket.rounds]);
  const losers = useMemo(() => bracket.rounds.filter((r) => !r.winnersSide), [bracket.rounds]);
  // Where Top 8 starts: Winners Semis (and the last 4 losers rounds) in double elimination,
  // the quarter-finals in single elimination. Grand Finals rounds don't count.
  const top8 = useMemo(() => {
    const main = winners.filter((r) => !/grand/i.test(r.label));
    return losers.length
      ? { winners: main.at(-2)?.key ?? null, losers: losers.at(-4)?.key ?? losers[0]?.key ?? null }
      : { winners: main.at(-3)?.key ?? main[0]?.key ?? null, losers: null };
  }, [winners, losers]);
  // 8 players or fewer: the whole bracket is Top 8, so there's nothing to jump to.
  const smallBracket = winners.filter((r) => !/grand/i.test(r.label)).length <= 3;
  const treeRef = useRef<HTMLDivElement>(null);
  const jump = (to: "start" | "top8") => {
    const el = treeRef.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let left = 0;
    let top = 0;
    const cols = to === "top8" ? [...el.querySelectorAll<HTMLElement>("[data-top8]")] : [];
    if (cols.length) {
      // Line up the left edge with whichever Top 8 column starts first (winners or losers),
      // and show the winners side's Top 8 from its first set.
      const base = el.getBoundingClientRect();
      left = Math.min(...cols.map((c) => c.getBoundingClientRect().left - base.left + el.scrollLeft)) - 16;
      const firstSet = cols[0].querySelector("a, .rounded-xl");
      if (firstSet) top = firstSet.getBoundingClientRect().top - base.top + el.scrollTop - 48;
    }
    el.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  };
  const tree = elimination && view === "tree";

  // Arriving from another pool's "Top 8" button (#top8): show the tree at Top 8.
  const arrivedTop8 = useRef(false);
  useEffect(() => {
    if (arrivedTop8.current || window.location.hash !== "#top8" || !elimination) return;
    if (view !== "tree") return setView("tree");
    arrivedTop8.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => jump("top8")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Searching in the tree: other sets fade, so bring the first match into view.
  const hits = tree && query ? bracket.rounds.reduce((n, r) => n + r.sets.filter((x) => matches(x, query, proj)).length, 0) : 0;
  const noneHere = query.length >= 2 && !bracket.rounds.some((r) => r.sets.some((x) => matches(x, query, proj)));
  useEffect(() => {
    if (!tree || !query) return;
    const el = treeRef.current;
    // The set that matters now: their first unfinished set; if they're done, their last one.
    const all = el ? [...el.querySelectorAll<HTMLElement>("[data-hit]")] : [];
    const first = all.find((x) => x.hasAttribute("data-open")) ?? all.at(-1);
    if (!el || !first) return;
    const base = el.getBoundingClientRect();
    const r = first.getBoundingClientRect();
    el.scrollTo({ left: Math.max(0, r.left - base.left + el.scrollLeft - 16), top: Math.max(0, r.top - base.top + el.scrollTop - 48), behavior: "auto" });
  }, [tree, query]);

  // Printing: the tree is wider than a sheet of paper, so the printed bracket is always the list
  // of rounds (it's swapped in just for the print, then back).
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <div>
      {!bracket.finished && source !== "smashy" && <AutoRefresh />}
      <div className="sticky top-0 z-[5] flex flex-wrap items-center gap-2 border-b border-line glass-sticky px-4 py-2 print:hidden">
        <label htmlFor="bracket-search" className="sr-only">{t("hostbracket.view.find")}</label>
        <input
          id="bracket-search"
          type="search"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("hostbracket.view.find")}
          className="field min-w-0 flex-1 py-1.5"
        />
        {myName && myHref ? (
          <Link href={`${myHref}${myHref.includes("?") ? "&" : "?"}q=${encodeURIComponent(myName)}`} className="chip py-1 text-meta">
            <Icon name="user" /> {t("entering.mysets.title")}
          </Link>
        ) : myName && (
          <button
            type="button"
            aria-pressed={raw === myName}
            onClick={() => setRaw(raw === myName ? "" : myName)}
            className="chip py-1 text-meta"
          >
            <Icon name="user" /> {t("entering.mysets.title")}
          </button>
        )}
        {elimination && (
          <div role="group" aria-label={t("hostbracket.view.layout")} className="flex gap-1">
            <button type="button" aria-pressed={view !== "tree"} onClick={() => setView("rounds")} className="chip py-1 text-meta">{t("hostbracket.view.rounds")}</button>
            <button type="button" aria-pressed={view === "tree"} onClick={() => setView("tree")} className="chip py-1 text-meta">{t("hostbracket.view.tree")}</button>
          </div>
        )}
        {canProject && (
          <button
            type="button"
            aria-pressed={projectedOn}
            onClick={() => setProjectedPref(projectedOn ? "off" : "on")}
            className="chip py-1 text-meta"
            title={t("hostbracket.view.projectedHint")}
          >
            <Icon name="chart" /> {t("hostbracket.view.projected")}
          </button>
        )}
        <button type="button" onClick={() => window.print()} className="chip py-1 text-meta" title={t("hostbracket.view.printHint")}>
          <Icon name="printer" /> {t("hostbracket.view.print")}
        </button>
      </div>
      {!bracket.finished && !query && <LiveStrip rounds={bracket.rounds} source={source} />}
      {noneHere && source === "startgg" && bracket.event.groups.length > 1 && <ElsewhereInEvent bracket={bracket} query={raw.trim()} />}
      {tree && !printing ? (
        <>
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            <button type="button" onClick={() => jump("start")} className="btn btn-sm btn-outline">{t("hostbracket.view.toRound1")}</button>
            {!top8Href && smallBracket ? null : top8Href ? (
              <Link href={`${top8Href}#top8`} className="btn btn-sm btn-outline">{t("hostbracket.view.toTop8")}</Link>
            ) : (
              <button type="button" onClick={() => jump("top8")} className="btn btn-sm btn-outline">{t("hostbracket.view.toTop8")}</button>
            )}
            {query ? (
              <span className="text-meta text-muted">{hits ? t("hostbracket.view.found", { n: hits }) : t("hostbracket.view.noneInPool")}</span>
            ) : (
              <span className="text-meta text-muted max-sm:hidden">{t("hostbracket.view.dragTip")}</span>
            )}
          </div>
          <DragScroll ref={treeRef} label={t("hostbracket.view.treeLabel")} className="mt-2 max-h-[75vh] border-y border-line">
            <div className="flex w-max min-w-full flex-col gap-6 p-4">
              <Tree rounds={winners} source={source} query={query} title={losers.length ? t("hostbracket.view.winners") : null} top8={top8.winners} proj={proj} />
              <Tree rounds={losers} source={source} query={query} title={t("hostbracket.view.losers")} top8={top8.losers} proj={proj} />
            </div>
          </DragScroll>
        </>
      ) : (
        <RoundsList rounds={bracket.rounds} source={source} query={printing ? "" : query} proj={printing ? null : proj} />
      )}
    </div>
  );
}
