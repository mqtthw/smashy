"use client";
// The tech-chase trainer, drawn with plain shapes on a canvas and counted in Melee's frames (round 949; the
// frame data and what is simplified are at the top of lib/techChase.ts). Fox falls, and on landing he techs in
// place, techs left or right, or misses the tech and bounces. You are Marth: A / D chase, S goes back to the
// middle, Space grabs (out on frames 7-8), W is a down tilt (out on 7-9). A grab only works on a standing,
// vulnerable Fox; on the floor he has to be hit. After a missed tech he gets up with a roll or a getup attack,
// which hits you if you're standing on him. Colours say what he is: flashing white = intangible, blue = open,
// purple = on the floor (hit, don't grab), green = got away. Three lives; the best score is kept in the browser.
import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { FALL_FRAMES, FPS, POINTS, START_LIVES, busy, foxAt, framesAt, judgeFrame, moveFrame, moveSlot, newScript, openFrames, striking, type Action, type Move, type Outcome, type PhaseName, type Script, type Slot, type Whiff } from "@/lib/techChase";
import { useStoredState } from "@/lib/useStoredState";

const W = 640;
const H = 280;
const GROUND = 214;
const slotX = (s: number) => W / 2 + s * 190;
const RESULT_MS = 1500;
const PHASE: Record<PhaseName, MessageKey> = { tech: "history.arcade.tech.p.tech", techRoll: "history.arcade.tech.p.techRoll", bounce: "history.arcade.tech.p.bounce", lying: "history.arcade.tech.p.lying", getupRoll: "history.arcade.tech.p.getupRoll", getupAttack: "history.arcade.tech.p.getupAttack", getupStand: "history.arcade.tech.p.getupStand" };
const WHIFF: Record<Exclude<Whiff, null>, MessageKey> = { intangible: "history.arcade.tech.w.intangible", downed: "history.arcade.tech.w.downed", wrongSpot: "history.arcade.tech.w.wrongSpot" };

type Game = {
  phase: "idle" | "round" | "result" | "over";
  script: Script | null;
  landAt: number; // when he lands (ms)
  speed: number;
  slot: Slot;
  px: number;
  action: Action;
  done: number; // the last frame judged
  frozen: number; // the frame the round ended on
  resultAt: number;
  outcome: Outcome;
  whiff: Whiff;
  points: number;
  punishes: number;
  lives: number;
};
const fresh = (speed: number): Game => ({ phase: "idle", script: null, landAt: 0, speed, slot: 0, px: slotX(0), action: null, done: 0, frozen: 0, resultAt: 0, outcome: null, whiff: null, points: 0, punishes: 0, lives: START_LIVES });
type Note = { key: MessageKey; values?: Record<string, string | number>; good: boolean };
type Hud = { phase: Game["phase"]; points: number; punishes: number; lives: number; note: Note | null; newBest: boolean };

function draw(ctx: CanvasRenderingContext2D, g: Game, now: number) {
  ctx.clearRect(0, 0, W, H);
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
  const f = g.phase === "round" ? framesAt(now - g.landAt, g.speed) + 1 : g.frozen;

  // Fox.
  let dx = slotX(0);
  let lying = 0;
  let lift = 0;
  let color = "#ff6b5e";
  let rolling = false;
  let hitting = false;
  if (g.script && g.phase !== "idle") {
    if (f < 1) {
      const p = 1 + (f - 1) / FALL_FRAMES; // 0 at the top of the fall, 1 on landing
      lift = (1 - p * p) * 130;
      lying = 0.5;
    } else {
      const fox = foxAt(g.script, f);
      const name = fox.phase?.name;
      dx = slotX(fox.spot);
      if (fox.free) color = "#7dff9a";
      else {
        color = !fox.vulnerable ? (Math.floor(f / 2) % 2 ? "#ffffff" : "#ffd0c8") : fox.downed ? "#c58bff" : "#5ad1ff";
        if (name === "techRoll" || name === "getupRoll") {
          rolling = fox.progress < 0.75;
          dx = slotX(fox.from) + (slotX(fox.phase!.to!) - slotX(fox.from)) * Math.min(1, fox.progress / 0.75);
        } else if (name === "bounce") {
          lying = 1;
          lift = Math.sin(fox.progress * Math.PI) * 16;
        } else if (name === "lying") lying = 1;
        else if (name === "tech" || name === "getupAttack" || name === "getupStand") lying = Math.max(0, 1 - fox.progress * (name === "getupAttack" ? 3 : 1.6));
        hitting = fox.hitting;
        if (name === "getupAttack" && !fox.vulnerable && !hitting) color = Math.floor(f / 2) % 2 ? "#ffffff" : "#ffb060";
      }
    }
    if (g.phase !== "round" && g.outcome?.kind === "grab") {
      color = "#ffd447";
      lift = 26;
      lying = 0;
      rolling = false;
    } else if (g.phase !== "round" && g.outcome?.kind === "hit") {
      color = "#ffd447";
      lift = 40;
      rolling = false;
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
  if (hitting) {
    // His getup attack: a sweep on both sides.
    ctx.strokeStyle = "#ff5a4f";
    ctx.lineWidth = 7;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dx + side * 34, GROUND - 22, 26, side === 1 ? -1.2 : Math.PI - 1.2, side === 1 ? 1.2 : Math.PI + 1.2);
      ctx.stroke();
    }
  }

  // Marth: a gold figure beside his spot. The arm reaches while the grab is out, the blade sweeps low for the tilt.
  const mf = moveFrame(g.action, f);
  const out = g.phase === "round" ? striking(g.action, f) : g.outcome?.kind === "grab" || g.outcome?.kind === "hit";
  const stuck = g.phase === "round" && busy(g.action, f);
  const windup = stuck && g.action && mf < 7 ? mf / 7 : 0;
  ctx.save();
  ctx.translate(g.px - 46, GROUND);
  ctx.fillStyle = g.phase !== "round" && g.outcome?.kind === "gotHit" ? "#ff5a4f" : stuck && !out ? "#b99a2a" : "#ffd447";
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(14, 0);
  ctx.lineTo(20, -46);
  ctx.lineTo(-8, -46);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -58, 12, 0, Math.PI * 2);
  ctx.fill();
  const move = g.action?.move ?? (g.outcome?.kind === "hit" ? "tilt" : "grab");
  if (move === "tilt" && (out || windup)) {
    ctx.fillStyle = "#e8f4ff";
    ctx.fillRect(14, -12, (out ? 62 : windup * 30), 5);
  } else ctx.fillRect(14, -40, 10 + (out ? 32 : windup * 12), 9);
  ctx.restore();
}

export default function TechChase() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [half, setHalf] = useState(false);
  const game = useRef<Game>(fresh(1));
  const [bestStored, setBest] = useStoredState("arcade.tech.best", "0");
  const best = Number(bestStored) || 0;
  const bestRef = useRef(best);
  useEffect(() => {
    bestRef.current = best;
  }, [best]);
  const [hud, setHud] = useState<Hud>({ phase: "idle", points: 0, punishes: 0, lives: START_LIVES, note: null, newBest: false });

  const nextRound = useCallback((now: number) => {
    const g = game.current;
    Object.assign(g, { phase: "round", script: newScript(Math.random), landAt: now + (FALL_FRAMES * 1000) / FPS / g.speed, slot: 0, action: null, done: 0, outcome: null, whiff: null });
    setHud((h) => ({ ...h, note: null }));
  }, []);

  const start = useCallback(() => {
    game.current = fresh(half ? 0.5 : 1);
    setHud({ phase: "round", points: 0, punishes: 0, lives: START_LIVES, note: null, newBest: false });
    nextRound(performance.now());
  }, [half, nextRound]);

  const act = useCallback(
    (what: "left" | "right" | "centre" | Move) => {
      const g = game.current;
      if (g.phase === "idle" || g.phase === "over") {
        if (what === "grab") start();
        return;
      }
      if (g.phase !== "round") return;
      const f = framesAt(performance.now() - g.landAt, g.speed) + 1;
      if (busy(g.action, f)) return; // mid-move: Marth can't do anything else yet
      if (what === "left") g.slot = moveSlot(g.slot, -1);
      else if (what === "right") g.slot = moveSlot(g.slot, 1);
      else if (what === "centre") g.slot = 0;
      else g.action = { move: what, since: f };
    },
    [start],
  );

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let id = requestAnimationFrame(function frame(now) {
      const g = game.current;
      g.px += (slotX(g.slot) - g.px) * 0.4;
      if (g.phase === "round" && g.script) {
        // Judge every game frame since the last screen frame, so a slow screen can't skip the two frames a grab is out.
        const f = framesAt(now - g.landAt, g.speed) + 1;
        for (let k = Math.max(1, g.done + 1); k <= f && g.phase === "round"; k++) {
          g.done = k;
          const { outcome, whiff } = judgeFrame(g.script, k, g.slot, g.action);
          if (whiff && whiff !== g.whiff) {
            g.whiff = whiff;
            setHud((h) => ({ ...h, note: { key: WHIFF[whiff], good: false } }));
          }
          if (!outcome) continue;
          g.phase = "result";
          g.outcome = outcome;
          g.frozen = k;
          g.resultAt = now;
          let note: Note;
          if (outcome.kind === "grab" || outcome.kind === "hit") {
            g.points += POINTS[outcome.kind];
            g.punishes++;
            const [a, b] = openFrames(g.script.phases.find((p) => p.name === outcome.phase)!);
            note = { key: outcome.kind === "grab" ? "history.arcade.tech.r.grab" : "history.arcade.tech.r.hit", values: { f: outcome.frame, what: outcome.phase, a, b, n: POINTS[outcome.kind] }, good: true };
          } else {
            g.lives--;
            const last = g.script.phases.at(-1)!;
            note = outcome.kind === "gotHit" ? { key: "history.arcade.tech.r.gotHit", good: false } : { key: "history.arcade.tech.r.escaped", values: { what: last.name, a: openFrames(last)[0], b: openFrames(last)[1] }, good: false };
          }
          setHud((h) => ({ ...h, points: g.points, punishes: g.punishes, lives: g.lives, note }));
        }
      } else if (g.phase === "result" && now - g.resultAt > RESULT_MS) {
        if (g.lives > 0) nextRound(now);
        else {
          g.phase = "over";
          const newBest = g.speed === 1 && g.points > bestRef.current;
          if (newBest) setBest(String(g.points));
          setHud((h) => ({ ...h, phase: "over", newBest }));
        }
      }
      draw(ctx, g, now);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [nextRound, setBest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      const k = e.key.toLowerCase();
      const what = k === "a" || k === "arrowleft" ? "left" : k === "d" || k === "arrowright" ? "right" : k === "s" || k === "arrowdown" ? "centre" : k === "w" || k === "arrowup" ? "tilt" : k === " " ? "grab" : null;
      if (!what) return;
      e.preventDefault(); // Space must not scroll the page or press a focused button
      act(what);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${t("history.arcade.tech.shareText", { n: hud.points, k: hud.punishes })}\nhttps://smashy.gg/arcade/tech-chase`);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };
  const pad = (what: Parameters<typeof act>[0], label: string, text: string, strong = false) => (
    <button type="button" aria-label={label} onPointerDown={(e) => { e.preventDefault(); act(what); }} className={`btn btn-md ${strong ? "btn-inverse" : "btn-outline"} flex-1 touch-none select-none`}>{text}</button>
  );
  // A phase's name inside a result line ("frame 23 of tech in place").
  const noteText = (n: Note) => t(n.key, n.values && "what" in n.values ? { ...n.values, what: t(PHASE[n.values.what as PhaseName]) } : n.values);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
        <span>{t("history.arcade.tech.points", { n: hud.points })}</span>
        <span aria-label={t("history.arcade.tech.lives", { n: hud.lives })} className="tracking-widest">
          {Array.from({ length: START_LIVES }, (_, i) => <span key={i} aria-hidden="true" className={i < hud.lives ? "text-brand" : "text-muted opacity-40"}>●</span>)}
        </span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
      </div>
      <div className="card relative overflow-hidden">
        <canvas ref={canvas} width={W} height={H} className="block h-auto w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3" role="status">
          {hud.phase === "round" && hud.note && (
            <p key={`${hud.note.key}-${hud.points}-${hud.lives}`} className={`arcade-pop badge border bg-overlay px-3 py-1 text-center text-sm ${hud.note.good ? "border-success text-success" : "border-danger"}`}>{noteText(hud.note)}</p>
          )}
        </div>
        {hud.phase !== "round" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-overlay p-4 text-center">
            {hud.phase === "over" && hud.newBest && <Confetti />}
            {hud.phase === "over" ? (
              <>
                <p className="arcade-pop text-3xl font-black italic tabular-nums">{t("history.arcade.tech.points", { n: hud.points })}</p>
                <p className="text-sm">{t("history.arcade.tech.punishes", { n: hud.punishes })}</p>
                {hud.newBest && <p className="arcade-pop badge border border-success text-success">{t("history.arcade.hl.newBest")}</p>}
              </>
            ) : (
              <p className="max-w-md text-sm">{t("history.arcade.tech.how")}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={start} className="btn btn-md btn-inverse">{t(hud.phase === "over" ? "history.arcade.hl.again" : "history.arcade.tech.start")}</button>
              {hud.phase === "over" && hud.points > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
            </div>
            <label className="flex items-center gap-2 text-meta">
              <input type="checkbox" checked={half} onChange={(e) => setHalf(e.target.checked)} />
              {t("history.arcade.tech.half")}
            </label>
          </div>
        )}
      </div>
      {/* The same moves as buttons, for phones (and anyone who'd rather tap). */}
      <div className="flex gap-2">
        {pad("left", t("history.arcade.tech.left"), "◀ A")}
        {pad("centre", t("history.arcade.tech.centre"), "● S")}
        {pad("right", t("history.arcade.tech.right"), "D ▶")}
        {pad("tilt", t("history.arcade.tech.hitBtn"), `${t("history.arcade.tech.hitBtn")} (W)`)}
        {pad("grab", t("history.arcade.tech.grabBtn"), t("history.arcade.tech.grabBtn"), true)}
      </div>
      <ul className="flex flex-col gap-1 text-meta text-muted">
        <li>{t("history.arcade.tech.keys")}</li>
        <li>{t("history.arcade.tech.colours")}</li>
        <li>{t("history.arcade.tech.frames")}</li>
        <li>{t("history.arcade.tech.note")}</li>
      </ul>
    </div>
  );
}
