"use client";
// The tech-chase trainer (round 946): a reaction game drawn with plain shapes on a canvas. A dummy is knocked
// down in the middle, lies there a moment, then gets up one of four ways: rolling left, rolling right, on the
// spot, or not teching at all (it just lies there, open at once). It flashes white while it can't be touched;
// the grab only works in the short blue moment after. A / D chase, S goes back to the middle, Space grabs
// (buttons do the same on a phone). Three lives; it speeds up with every grab. The rules are in
// lib/techChase.ts; the best score is kept in this browser.
import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { FALL_MS, START_LIVES, WHIFF_MS, average, judgeGrab, moveSlot, newRound, reactionMs, techSlot, type Judge, type Slot, type TechOption, type TechRound } from "@/lib/techChase";
import { useStoredState } from "@/lib/useStoredState";

const W = 640;
const H = 280;
const GROUND = 214;
const slotX = (s: number) => W / 2 + s * 190;
const RESULT_MS = 900;
const OPTION: Record<TechOption, MessageKey> = { left: "history.arcade.tech.o.left", right: "history.arcade.tech.o.right", inPlace: "history.arcade.tech.o.inPlace", missed: "history.arcade.tech.o.missed" };
const MISS: Record<Exclude<Judge, "grab">, MessageKey> = { early: "history.arcade.tech.early", late: "history.arcade.tech.late", wrongSpot: "history.arcade.tech.wrong" };

type Game = {
  phase: "idle" | "round" | "result" | "over";
  round: TechRound | null;
  t0: number; // when the knockdown began
  slot: Slot;
  px: number; // where the player is drawn (eases towards its spot)
  whiffUntil: number;
  whiffAt: number;
  resultAt: number;
  result: Judge | null;
  grabs: number;
  lives: number;
  reactions: number[];
};
const fresh = (): Game => ({ phase: "idle", round: null, t0: 0, slot: 0, px: slotX(0), whiffUntil: 0, whiffAt: 0, resultAt: 0, result: null, grabs: 0, lives: START_LIVES, reactions: [] });
type Hud = { phase: Game["phase"]; grabs: number; lives: number; note: { key: MessageKey; ms?: number; option?: TechOption; good: boolean } | null; avg: number; newBest: boolean };

function draw(ctx: CanvasRenderingContext2D, g: Game, now: number) {
  ctx.clearRect(0, 0, W, H);
  // The stage: a slab with three marked spots.
  ctx.fillStyle = "rgba(190,200,255,0.10)";
  ctx.fillRect(40, GROUND, W - 80, 10);
  ctx.fillStyle = "rgba(190,200,255,0.35)";
  ctx.fillRect(40, GROUND, W - 80, 2);
  for (const s of [-1, 0, 1]) {
    ctx.fillStyle = s === g.slot && g.phase !== "idle" ? "#ffd447" : "rgba(190,200,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(slotX(s) - 16, GROUND + 22);
    ctx.lineTo(slotX(s) + 16, GROUND + 22);
    ctx.lineTo(slotX(s), GROUND + 12);
    ctx.fill();
  }

  // The dummy.
  const r = g.round;
  let dx = slotX(0);
  let lying = 1; // 1 flat on the ground, 0 upright
  let lift = 0;
  let color = "#ff6b5e";
  let ring = 0; // 1..0 while the opening lasts
  let rolling = false;
  if (r && g.phase !== "idle") {
    const t = (g.phase === "round" ? now : g.resultAt) - g.t0;
    const since = t - FALL_MS - r.waitMs;
    const target = slotX(techSlot(r.option));
    if (t < FALL_MS) {
      const p = t / FALL_MS;
      lift = (1 - p * p) * 120;
      lying = p;
    } else if (since < 0) {
      lying = 1;
    } else if (since < r.rollMs) {
      const p = since / r.rollMs;
      dx = slotX(0) + (target - slotX(0)) * (1 - (1 - p) ** 2);
      rolling = true;
      color = Math.floor(now / 60) % 2 ? "#ffffff" : "#ffd0c8"; // invincible: it flashes
    } else {
      dx = target;
      lying = r.option === "missed" ? 1 : 0;
      const p = (since - r.rollMs) / r.openMs;
      if (p <= 1) {
        color = "#5ad1ff"; // open
        ring = 1 - p;
      } else color = "#7dff9a"; // got away
    }
    if (g.phase === "result" && g.result === "grab") {
      color = "#ffd447";
      lift = 26;
      lying = 0;
    }
  }
  ctx.save();
  ctx.translate(dx, GROUND - lift);
  if (rolling) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -22, 13, now / 70, now / 70 + 4);
    ctx.stroke();
  } else {
    ctx.translate(0, -18 - (1 - lying) * 22);
    ctx.rotate((lying * Math.PI) / 2);
    ctx.fillStyle = color;
    ctx.fillRect(-16, -22, 32, 44);
    ctx.beginPath();
    ctx.arc(0, -30, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (ring > 0 && g.phase === "round") {
    ctx.strokeStyle = "#5ad1ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(dx, GROUND - 30, 34 + ring * 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  // The player: a gold figure beside its spot, leaning in to grab.
  const whiffing = now < g.whiffUntil;
  const reach = g.phase === "result" && g.result === "grab" ? 1 : whiffing ? Math.max(0, 1 - (now - g.whiffAt) / 160) : 0;
  ctx.save();
  ctx.translate(g.px - 46, GROUND);
  ctx.fillStyle = whiffing ? "#a8922e" : "#ffd447";
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(14, 0);
  ctx.lineTo(20, -46);
  ctx.lineTo(-8, -46);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -58, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(14, -40, 10 + reach * 30, 9); // the arm
  ctx.restore();
}

export default function TechChase() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>(fresh());
  const [bestStored, setBest] = useStoredState("arcade.tech.best", "0");
  const best = Number(bestStored) || 0;
  const bestRef = useRef(best);
  useEffect(() => {
    bestRef.current = best;
  }, [best]);
  const [hud, setHud] = useState<Hud>({ phase: "idle", grabs: 0, lives: START_LIVES, note: null, avg: 0, newBest: false });

  const nextRound = useCallback((now: number) => {
    const g = game.current;
    Object.assign(g, { phase: "round", round: newRound(g.grabs, Math.random), t0: now, slot: 0, result: null, whiffUntil: 0 });
  }, []);

  const finish = useCallback((kind: Judge, now: number, ms = 0) => {
    const g = game.current;
    if (g.phase !== "round" || !g.round) return;
    g.phase = "result";
    g.result = kind;
    g.resultAt = now;
    if (kind === "grab") {
      g.grabs++;
      g.reactions.push(ms);
    } else g.lives--;
    setHud((h) => ({ ...h, phase: "round", grabs: g.grabs, lives: g.lives, note: kind === "grab" ? { key: "history.arcade.tech.grab", ms, good: true } : { key: MISS[kind], option: g.round!.option, good: false } }));
  }, []);

  const start = useCallback(() => {
    game.current = fresh();
    setHud({ phase: "round", grabs: 0, lives: START_LIVES, note: null, avg: 0, newBest: false });
    nextRound(performance.now());
  }, [nextRound]);

  const act = useCallback(
    (what: "left" | "right" | "centre" | "grab") => {
      const g = game.current;
      const now = performance.now();
      if (g.phase === "idle" || g.phase === "over") {
        if (what === "grab") start();
        return;
      }
      if (g.phase !== "round" || !g.round || now < g.whiffUntil) return;
      if (what === "left") g.slot = moveSlot(g.slot, -1);
      else if (what === "right") g.slot = moveSlot(g.slot, 1);
      else if (what === "centre") g.slot = 0;
      else {
        const since = now - g.t0 - FALL_MS - g.round.waitMs;
        const verdict = judgeGrab(g.round, since, g.slot);
        if (verdict === "grab") finish("grab", now, reactionMs(g.round, since));
        else {
          // A whiff: stuck for a moment, which usually costs the opening.
          g.whiffAt = now;
          g.whiffUntil = now + WHIFF_MS;
        }
      }
    },
    [finish, start],
  );

  // The loop: draws every frame, and ends a round when the opening passes or the pause after a result is over.
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let id = requestAnimationFrame(function frame(now) {
      const g = game.current;
      g.px += (slotX(g.slot) - g.px) * 0.35;
      if (g.phase === "round" && g.round && now - g.t0 - FALL_MS - g.round.waitMs > g.round.rollMs + g.round.openMs) finish(g.slot === techSlot(g.round.option) ? "late" : "wrongSpot", now);
      else if (g.phase === "result" && now - g.resultAt > RESULT_MS) {
        if (g.lives > 0) nextRound(now);
        else {
          g.phase = "over";
          const newBest = g.grabs > bestRef.current;
          if (newBest) setBest(String(g.grabs));
          setHud((h) => ({ ...h, phase: "over", avg: average(g.reactions), newBest }));
        }
      }
      draw(ctx, g, now);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [finish, nextRound, setBest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      const k = e.key.toLowerCase();
      const what = k === "a" || k === "arrowleft" ? "left" : k === "d" || k === "arrowright" ? "right" : k === "s" || k === "arrowdown" ? "centre" : k === " " ? "grab" : null;
      if (!what) return;
      e.preventDefault(); // Space must not scroll the page or press a focused button
      act(what);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${t("history.arcade.tech.shareText", { n: hud.grabs, ms: hud.avg })}\nhttps://smashy.gg/arcade/tech-chase`);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };
  const pad = (what: Parameters<typeof act>[0], label: string, text: string, wide = false) => (
    <button type="button" aria-label={label} onPointerDown={(e) => { e.preventDefault(); act(what); }} className={`btn btn-md ${wide ? "btn-inverse flex-[2]" : "btn-outline flex-1"} touch-none select-none`}>{text}</button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
        <span>{t("history.arcade.tech.grabs", { n: hud.grabs })}</span>
        <span aria-label={t("history.arcade.tech.lives", { n: hud.lives })} className="tracking-widest">
          {Array.from({ length: START_LIVES }, (_, i) => <span key={i} aria-hidden="true" className={i < hud.lives ? "text-brand" : "text-muted opacity-40"}>●</span>)}
        </span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
      </div>
      <div className="card relative overflow-hidden">
        <canvas ref={canvas} width={W} height={H} className="block h-auto w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3" role="status">
          {hud.phase === "round" && hud.note && (
            <p key={`${hud.grabs}-${hud.lives}`} className={`arcade-pop badge border px-3 py-1 text-sm ${hud.note.good ? "border-success text-success" : "border-danger"}`}>
              {t(hud.note.key, { ms: hud.note.ms ?? 0 })}
              {hud.note.option && ` · ${t(OPTION[hud.note.option])}`}
            </p>
          )}
        </div>
        {hud.phase !== "round" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-overlay p-4 text-center">
            {hud.phase === "over" && hud.newBest && <Confetti />}
            {hud.phase === "over" ? (
              <>
                <p className="arcade-pop text-3xl font-black italic tabular-nums">{t("history.arcade.tech.grabs", { n: hud.grabs })}</p>
                {hud.grabs > 0 && <p className="text-sm">{t("history.arcade.tech.avg", { ms: hud.avg })}</p>}
                {hud.newBest && <p className="arcade-pop badge border border-success text-success">{t("history.arcade.hl.newBest")}</p>}
              </>
            ) : (
              <p className="max-w-md text-sm">{t("history.arcade.tech.how")}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={start} className="btn btn-md btn-inverse">{t(hud.phase === "over" ? "history.arcade.hl.again" : "history.arcade.tech.start")}</button>
              {hud.phase === "over" && hud.grabs > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
            </div>
          </div>
        )}
      </div>
      {/* The same four moves as buttons, for phones (and anyone who'd rather tap). */}
      <div className="flex gap-2">
        {pad("left", t("history.arcade.tech.left"), "◀ A")}
        {pad("centre", t("history.arcade.tech.centre"), "● S")}
        {pad("right", t("history.arcade.tech.right"), "D ▶")}
        {pad("grab", t("history.arcade.tech.grabBtn"), t("history.arcade.tech.grabBtn"), true)}
      </div>
      <ul className="flex flex-col gap-1 text-meta text-muted">
        <li>{t("history.arcade.tech.keys")}</li>
        <li>{t("history.arcade.tech.colours")}</li>
        <li>{t("history.arcade.tech.note")}</li>
      </ul>
    </div>
  );
}
