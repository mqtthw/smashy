"use client";
// Small moving parts the Arcade's games share (round 945): confetti for a win, the tries meter, a number that
// counts up, and the clock to the next daily puzzle. The motion itself is in globals.css (".arcade-…") and
// stands still for people who ask for less of it.
import { useEffect, useState, useRef } from "react";
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
  // In a row that scrolls sideways, keep the picked one in sight (only the row scrolls, not the page).
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = row.current;
    const b = r?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!r || !b || r.scrollWidth <= r.clientWidth) return;
    r.scrollTo({ left: Math.max(0, b.offsetLeft - r.offsetLeft - 16), behavior: "smooth" });
  }, [value]);
  return (
    <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-label={label}>
      <span className="text-meta font-bold uppercase tracking-wide text-muted">{label}</span>
      {/* On a phone, one row that scrolls sideways (round 980), so the game stays near the top. */}
      <div ref={row} className="arcade-pick-row flex flex-wrap gap-1.5">
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

/**
 * A block that scrolls itself into view when it appears (round 980: on a phone the result and "Next" under an
 * answer were below the screen). Only as far as needed, clear of the bottom bar.
 */
export function Reveal({ className = "", role, children }: { className?: string; role?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  return (
    <div ref={ref} className={`arcade-reveal ${className}`} role={role}>
      {children}
    </div>
  );
}

/**
 * When a guess box is tapped on a phone, move it to the top of the screen once the keyboard is up (round 981), so the
 * suggestions under it show in the space above the keyboard instead of behind it. `room` is a spacer to put under
 * the suggestions while typing, so the page is long enough to scroll the box that far.
 */
export function useLift() {
  const [typing, setTyping] = useState(false);
  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    setTyping(true);
    window.setTimeout(() => el.scrollIntoView({ block: "start", behavior: "smooth" }), 300);
  };
  // Tapping a suggestion blurs the box first: keep the room until the tap has landed.
  const onBlur = () => window.setTimeout(() => setTyping(false), 250);
  const room = typing ? <div aria-hidden="true" className="h-[60vh] sm:hidden" /> : null;
  return { onFocus, onBlur, room };
}
