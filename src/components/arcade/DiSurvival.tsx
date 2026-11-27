"use client";
// DI survival (round 950): you get hit, on Final Destination, by a move at a percent where it kills with no
// DI but can be survived. While the hit freezes, hold a direction (WASD); when the freeze ends that direction
// bends the launch by up to 18 degrees, and the launch is flown frame by frame with Melee's knockback maths
// (lib/diSurvival.ts, with its sources). The dashed line is where no DI would have sent you. Three stocks; the
// best run is kept in this browser. Plain shapes only.
import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { characterName } from "@/lib/characters";
import { DI_VICTIMS, STAGES, STAGE_KEYS, dealHit, passedTopAlive, resolveHit, type DiHit, type Stage, type StageKey, type Stick, type Victim } from "@/lib/diSurvival";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { FPS, framesAt } from "@/lib/techChase";
import { useStoredState } from "@/lib/useStoredState";

const W = 640;
const H = 440;
// Pixels per game unit and where the ground is drawn: set for the stage being played, so the biggest (Dream
// Land) and the smallest (Yoshi's Story) both fill the picture.
let S = 1.2;
let GROUND_Y = 250;
const fit = (stage: Stage) => {
  S = Math.min((W - 40) / (stage.right - stage.left), (H - 44) / (stage.top - stage.bottom));
  GROUND_Y = 20 + stage.top * S;
};
const sx = (x: number) => W / 2 + x * S;
const sy = (y: number) => GROUND_Y - y * S;
const FREEZE_FRAMES = 60; // time to read the hit and choose (Smashy's own, not the move's hitlag)
const RESULT_MS = 2200;
const LIVES = 3;
const ARROWS: Record<string, string> = { "0,0": "·", "1,0": "→", "-1,0": "←", "0,1": "↑", "0,-1": "↓", "1,1": "↗︎", "-1,1": "↖", "1,-1": "↘", "-1,-1": "↙" };
const arrow = (s: Stick) => ARROWS[`${s.x},${s.y}`];
const ZONE: Record<"top" | "side" | "bottom", MessageKey> = { top: "history.arcade.di.zone.top", side: "history.arcade.di.zone.side", bottom: "history.arcade.di.zone.bottom" };

type Solved = ReturnType<typeof resolveHit>;
type Game = { phase: "idle" | "freeze" | "flight" | "result" | "over"; hit: DiHit | null; at: number; solved: Solved | null; stick: Stick; lives: number; survived: number; victim: Victim; stage: Stage };
type Hud = { phase: Game["phase"]; lives: number; survived: number; hit: DiHit | null; note: { key: MessageKey; values: Record<string, string | number>; good: boolean } | null; newBest: boolean };

function path(ctx: CanvasRenderingContext2D, points: [number, number][], upTo = points.length) {
  ctx.beginPath();
  points.slice(0, upTo).forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, g: Game, now: number) {
  const STAGE = g.stage;
  fit(STAGE);
  ctx.clearRect(0, 0, W, H);
  // The blast lines: past them is a KO.
  ctx.strokeStyle = "rgba(255,90,79,0.7)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(sx(STAGE.left), sy(STAGE.top), (STAGE.right - STAGE.left) * S, (STAGE.top - STAGE.bottom) * S);
  ctx.setLineDash([]);
  // Final Destination: a slab.
  ctx.fillStyle = "rgba(190,200,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(sx(-STAGE.edge), sy(0));
  ctx.lineTo(sx(STAGE.edge), sy(0));
  ctx.lineTo(sx(STAGE.edge - 22), sy(0) + 40);
  ctx.lineTo(sx(-STAGE.edge + 22), sy(0) + 40);
  ctx.fill();
  ctx.fillStyle = "rgba(190,200,255,0.7)";
  ctx.fillRect(sx(-STAGE.edge), sy(0), STAGE.edge * 2 * S, 2);
  const hit = g.hit;
  if (!hit || g.phase === "idle") return;
  const f = framesAt(now - g.at);

  if (g.phase === "freeze") {
    // The attacker, on the side the hit comes from, and the way the hit sends (before any DI).
    const ax = sx(hit.x0 - hit.facing * 16);
    ctx.fillStyle = "#ff6b5e";
    ctx.fillRect(ax - 9, sy(0) - 34, 18, 34);
    ctx.beginPath();
    ctx.arc(ax, sy(0) - 43, 9, 0, Math.PI * 2);
    ctx.fill();
    const a = (((hit.move.angle === 361 ? 44 : hit.move.angle) * Math.PI) / 180);
    const dirX = Math.cos(a) * hit.facing;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(sx(hit.x0), sy(8));
    ctx.lineTo(sx(hit.x0) + dirX * 90, sy(8) - Math.sin(a) * 90);
    ctx.stroke();
    ctx.setLineDash([]);
    // The freeze running out.
    const left = Math.max(0, 1 - f / FREEZE_FRAMES);
    ctx.fillStyle = "#ffd447";
    ctx.fillRect(W / 2 - 72, H - 14, 144 * left, 6);
    // The held direction.
    if (g.stick.x || g.stick.y) {
      ctx.strokeStyle = "#ffd447";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx(hit.x0), sy(8));
      ctx.lineTo(sx(hit.x0) + g.stick.x * 30, sy(8) - g.stick.y * 30);
      ctx.stroke();
    }
  }
  let px = hit.x0;
  let py = 0;
  if (g.solved && g.phase !== "freeze") {
    const mine = g.solved.mine.points;
    const upTo = g.phase === "flight" ? Math.min(mine.length, f + 1) : mine.length;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.setLineDash([5, 6]);
    path(ctx, g.solved.none.points);
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = g.solved.mine.ko && g.phase !== "flight" ? "#ff5a4f" : "#ffd447";
    path(ctx, mine, upTo);
    [px, py] = mine[upTo - 1];
  }
  ctx.fillStyle = g.phase === "freeze" && Math.floor(f / 3) % 2 ? "#ffffff" : "#ffd447";
  ctx.beginPath();
  ctx.arc(sx(px), sy(py + 8), 9, 0, Math.PI * 2);
  ctx.fill();
}

export default function DiSurvival() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [victim, setVictim] = useState<Victim>("fox");
  const [stage, setStage] = useState<StageKey>("fd");
  const game = useRef<Game>({ phase: "idle", hit: null, at: 0, solved: null, stick: { x: 0, y: 0 }, lives: LIVES, survived: 0, victim: "fox", stage: STAGES.fd });
  const held = useRef(new Set<string>());
  const [bestStored, setBest] = useStoredState("arcade.di.best", "0");
  const best = Number(bestStored) || 0;
  const bestRef = useRef(best);
  useEffect(() => {
    bestRef.current = best;
  }, [best]);
  const [hud, setHud] = useState<Hud>({ phase: "idle", lives: LIVES, survived: 0, hit: null, note: null, newBest: false });
  const [holding, setHolding] = useState("·");

  const readStick = useCallback(() => {
    const k = held.current;
    const stick = { x: (k.has("right") ? 1 : 0) - (k.has("left") ? 1 : 0), y: (k.has("up") ? 1 : 0) - (k.has("down") ? 1 : 0) };
    game.current.stick = stick;
    setHolding(arrow(stick));
  }, []);

  const nextHit = useCallback((now: number) => {
    const g = game.current;
    const hit = dealHit(Math.random, g.victim, g.survived, g.stage);
    Object.assign(g, { phase: "freeze", hit, at: now, solved: null });
    setHud((h) => ({ ...h, phase: "freeze", hit, note: null }));
  }, []);

  const start = useCallback(() => {
    game.current = { phase: "idle", hit: null, at: 0, solved: null, stick: game.current.stick, lives: LIVES, survived: 0, victim, stage: STAGES[stage] };
    setHud({ phase: "freeze", lives: LIVES, survived: 0, hit: null, note: null, newBest: false });
    nextHit(performance.now());
  }, [nextHit, stage, victim]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let id = requestAnimationFrame(function frame(now) {
      const g = game.current;
      const f = framesAt(now - g.at);
      if (g.phase === "freeze" && g.hit && f >= FREEZE_FRAMES) {
        // The stick is read as the freeze ends, as the game reads it on the last frame of hitlag.
        g.solved = resolveHit(g.hit.move, g.hit.percent, g.victim, g.hit.x0, g.hit.facing, g.stick, g.stage);
        g.phase = "flight";
        g.at = now;
        setHud((h) => ({ ...h, phase: "flight" }));
      } else if (g.phase === "flight" && g.solved && f >= Math.min(g.solved.mine.points.length, FPS * 3)) {
        const s = g.solved;
        g.phase = "result";
        g.at = now;
        if (s.mine.ko) g.lives--;
        else g.survived++;
        const note: NonNullable<Hud["note"]> = s.mine.ko
          ? { key: "history.arcade.di.r.died", values: { zone: s.mine.ko, arrow: arrow(s.best.stick), you: arrow(g.stick) }, good: false }
          : { key: passedTopAlive(s.mine, g.stage) ? "history.arcade.di.r.livedTop" : "history.arcade.di.r.lived", values: { deg: Math.abs(Math.round(s.turned)), you: arrow(g.stick) }, good: true };
        setHud((h) => ({ ...h, phase: "result", lives: g.lives, survived: g.survived, note }));
      } else if (g.phase === "result" && now - g.at > RESULT_MS) {
        if (g.lives > 0) nextHit(now);
        else {
          g.phase = "over";
          const newBest = g.survived > bestRef.current;
          if (newBest) setBest(String(g.survived));
          setHud((h) => ({ ...h, phase: "over", newBest }));
        }
      }
      draw(ctx, g, now);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [nextHit, setBest]);

  useEffect(() => {
    const dir = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      return k === "a" || k === "arrowleft" ? "left" : k === "d" || k === "arrowright" ? "right" : k === "w" || k === "arrowup" ? "up" : k === "s" || k === "arrowdown" ? "down" : null;
    };
    const typing = (e: KeyboardEvent) => e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const d = dir(e);
      if (d) {
        e.preventDefault();
        held.current.add(d);
        readStick();
      } else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        if (game.current.phase === "idle" || game.current.phase === "over") start();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = dir(e);
      if (!d) return;
      held.current.delete(d);
      readStick();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [readStick, start]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${t("history.arcade.di.shareText", { n: hud.survived })}\nhttps://smashy.gg/arcade/di`);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };
  // The on-screen stick, for phones: a direction is held while its button is pressed.
  const padBtn = (s: Stick) => {
    const set = (on: boolean) => {
      held.current.clear();
      if (on) {
        if (s.x) held.current.add(s.x > 0 ? "right" : "left");
        if (s.y) held.current.add(s.y > 0 ? "up" : "down");
      }
      readStick();
    };
    return (
      <button key={arrow(s)} type="button" aria-label={arrow(s)} onPointerDown={(e) => { e.preventDefault(); set(true); }} onPointerUp={() => set(false)} onPointerLeave={() => set(false)} className="btn btn-sm btn-outline h-11 w-11 touch-none select-none p-0 text-lg">{arrow(s)}</button>
    );
  };
  const noteText = (n: NonNullable<Hud["note"]>) => t(n.key, "zone" in n.values ? { ...n.values, zone: t(ZONE[n.values.zone as "top" | "side" | "bottom"]) } : n.values);
  const idle = hud.phase === "idle" || hud.phase === "over";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
        <span>{t("history.arcade.di.survived", { n: hud.survived })}</span>
        <span aria-label={t("history.arcade.tech.lives", { n: hud.lives })} className="tracking-widest">
          {Array.from({ length: LIVES }, (_, i) => <span key={i} aria-hidden="true" className={i < hud.lives ? "text-brand" : "text-muted opacity-40"}>●</span>)}
        </span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
      </div>
      <div className="card relative overflow-hidden">
        <canvas ref={canvas} width={W} height={H} className="block h-auto w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-3 text-center" role="status">
          {!idle && hud.hit && (
            <p className="badge border border-line bg-overlay px-3 py-1 text-sm">
              {hud.hit.move.by}: {hud.hit.move.name} · {t("history.arcade.di.at", { n: hud.hit.percent })}
              {hud.phase === "freeze" && <span className="ml-2 font-bold text-brand">{t("history.arcade.di.hold")} {holding}</span>}
            </p>
          )}
          {hud.phase === "result" && hud.note && <p className={`arcade-pop badge border bg-overlay px-3 py-1 text-sm ${hud.note.good ? "border-success text-success" : "border-danger"}`}>{noteText(hud.note)}</p>}
        </div>
        {idle && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-overlay p-4 text-center">
            {hud.phase === "over" && hud.newBest && <Confetti />}
            {hud.phase === "over" ? (
              <>
                <p className="arcade-pop text-3xl font-black italic tabular-nums">{t("history.arcade.di.survived", { n: hud.survived })}</p>
                {hud.newBest && <p className="arcade-pop badge border border-success text-success">{t("history.arcade.hl.newBest")}</p>}
              </>
            ) : (
              <p className="max-w-md text-sm">{t("history.arcade.di.how")}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-meta">{t("history.arcade.di.victim")}</span>
              {DI_VICTIMS.map((v) => (
                <button key={v} type="button" onClick={() => setVictim(v)} aria-pressed={victim === v} className={`chip py-1 text-meta ${victim === v ? "border-brand text-brand" : ""}`}>{characterName("melee", v)}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-meta">{t("history.arcade.di.stage")}</span>
              {STAGE_KEYS.map((k) => (
                <button key={k} type="button" onClick={() => { setStage(k); if (game.current.phase !== "freeze" && game.current.phase !== "flight") game.current.stage = STAGES[k]; }} aria-pressed={stage === k} className={`chip py-1 text-meta ${stage === k ? "border-brand text-brand" : ""}`}>{STAGES[k].name}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={start} className="btn btn-md btn-inverse">{t(hud.phase === "over" ? "history.arcade.hl.again" : "history.arcade.tech.start")}</button>
              {hud.phase === "over" && hud.survived > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
            </div>
          </div>
        )}
      </div>
      <div className="grid w-max grid-cols-3 gap-1 self-center sm:hidden">
        {[{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }].map(padBtn)}
      </div>
      <ul className="flex flex-col gap-1 text-meta text-muted">
        <li>{t("history.arcade.di.keys")}</li>
        <li>{t("history.arcade.di.tip")}</li>
        <li>{t("history.arcade.di.maths")}</li>
        <li>{t("history.arcade.di.note")}</li>
      </ul>
    </div>
  );
}
