"use client";
// Small moving parts the Arcade's games share (round 945): confetti for a win, the tries meter, a number that
// counts up, and the clock to the next daily puzzle. The motion itself is in globals.css (".arcade-…") and
// stands still for people who ask for less of it.
import { useEffect, useState } from "react";
import { clock, untilNextPuzzle } from "@/lib/arcade";
import { useT } from "@/lib/i18n/client";

const COLORS = ["#ffd447", "#ff5a4f", "#5ad1ff", "#7dff9a", "#c58bff", "#ffffff"];

/** A burst of falling paper over its (position: relative) parent. Decoration only. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  return (
    <span aria-hidden="true" className="arcade-confetti">
      {Array.from({ length: pieces }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 9) * 70}ms`, width: i % 3 === 0 ? 6 : 9 }} />
      ))}
    </span>
  );
}

/** The tries meter: one slanted pip per try, red for a miss, green for the hit, hollow for what's left. */
export function Pips({ results, total }: { results: boolean[]; total: number }) {
  return (
    <span aria-hidden="true" className="arcade-pips">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={results[i] === undefined ? undefined : results[i] ? "pip-right" : "pip-wrong"} />
      ))}
    </span>
  );
}

/** A number that runs up to its value when shown (an entrant count being revealed). */
export function CountUp({ to, ms = 600 }: { to: number; ms?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setShown(to));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let id = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / ms);
      setShown(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) id = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(id);
  }, [to, ms]);
  return <span className="tabular-nums">{shown.toLocaleString("en-US")}</span>;
}

/** "Next puzzle in 07:04:09", ticking. Empty until the browser has the time. */
export function NextPuzzle({ className = "text-meta text-muted", bare = false }: { className?: string; bare?: boolean }) {
  const t = useT();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(untilNextPuzzle(Date.now()));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (bare) return <span className={className}>{left === null ? "--:--:--" : clock(left)}</span>;
  return <p className={className}>{left === null ? " " : t("history.arcade.next", { time: clock(left) })}</p>;
}

/**
 * A row of big choice buttons (round 972): an opponent, a stage. Each can have a stock icon. Locked while a round
 * is being played.
 */
export function Picker<K extends string>({ label, options, value, onPick, locked = false }: { label: string; options: { key: K; label: string; icon?: string | null }[]; value: K; onPick: (k: K) => void; locked?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={label}>
      <span className="text-meta font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.key} type="button" disabled={locked} onClick={() => onPick(o.key)} aria-pressed={value === o.key} className="arcade-pick">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small stock icon */}
            {o.icon && <img src={o.icon} alt="" width={24} height={24} className="h-6 w-6 object-contain" />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
