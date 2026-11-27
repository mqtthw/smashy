"use client";
// DI survival (round 950): you get hit, on Final Destination, by a move at a percent where it kills with no
// DI but can be survived. While the hit freezes, hold a direction (WASD); when the freeze ends that direction
// bends the launch by up to 18 degrees, and the launch is flown frame by frame with Melee's knockback maths
// (lib/diSurvival.ts, with its sources). The dashed line is where no DI would have sent you. Three stocks; the
// best run is kept in this browser. Plain shapes only until round 977 (Matthew: "we want accurate visuals for the
// DI survival game because the visual cues of seeing the move that you are DIing is essential"): now the attacker
// does the real move (their outline, frame by frame) up to the frame it hits, placed so its hitbox is on you; the
// freeze holds both there with you in the hit pose the game picks; then you tumble along the launch in that pose
// while the attacker finishes the move (lib/diVisuals.ts). The camera is close for the move and pulls back for the
// flight. Where the outlines aren't served (the public copy), the plain shapes are drawn instead.
import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_LOOK } from "@/components/arcade/ArcadeArt";
import { Confetti, Picker } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { characterName } from "@/lib/characters";
import { stockIconUrl } from "@/lib/mainBadge";
import { DI_VICTIMS, STAGES, STAGE_KEYS, dealHit, launchAngle, passedTopAlive, resolveHit, touchStick, type DiHit, type Stage, type StageKey, type Stick, type Victim } from "@/lib/diSurvival";
import { hitScene, type HitScene } from "@/lib/diVisuals";
import { loadOutlines, outlinePath, type Outlines } from "@/lib/outlines";
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
// Each arrow ends in U+FE0E so iPhones draw it as text, not as a blue emoji tile (round 984).
const ARROWS: Record<string, string> = { "0,0": "·", "1,0": "→︎", "-1,0": "←︎", "0,1": "↑︎", "0,-1": "↓︎", "1,1": "↗︎", "-1,1": "↖︎", "1,-1": "↘︎", "-1,-1": "↙︎" };
/** The arrow for a stick: a keyboard's own, or the nearest of the eight to a touch stick's angle (round 985). */
const arrow = (s: Stick) => {
  if (!s.x && !s.y) return ARROWS["0,0"];
  const a = (Math.round(Math.atan2(s.y, s.x) / (Math.PI / 4)) * Math.PI) / 4;
  return ARROWS[`${Math.round(Math.cos(a)) || 0},${Math.round(Math.sin(a)) || 0}`];
};
const ZONE: Record<"top" | "side" | "bottom", MessageKey> = { top: "history.arcade.di.zone.top", side: "history.arcade.di.zone.side", bottom: "history.arcade.di.zone.bottom" };

type Solved = ReturnType<typeof resolveHit>;
/** The stick as the game hears it: a touch stick inside the deadzone is no stick at all. */
const heard = (g: Pick<Game, "stick" | "analog">) => (g.analog ? touchStick(g.stick) : g.stick);
type Game = { phase: "idle" | "windup" | "freeze" | "flight" | "result" | "over"; hit: DiHit | null; scene: HitScene | null; at: number; solved: Solved | null; stick: Stick; analog: boolean; lives: number; survived: number; victim: Victim; stage: Stage };
// The characters' outlines, by who (loaded as they're needed).
const figs: Record<string, Outlines | null> = {};
const need = (who: string) => {
  if (!(who in figs)) {
    figs[who] = null;
    loadOutlines(who).then((o) => {
      figs[who] = o;
    });
  }
};
const FLIGHT_ZOOM_FRAMES = 24; // the camera pulling back as the flight starts
type Hud = { phase: Game["phase"]; lives: number; survived: number; hit: DiHit | null; note: { key: MessageKey; values: Record<string, string | number>; good: boolean } | null; newBest: boolean };

function path(ctx: CanvasRenderingContext2D, points: [number, number][], upTo = points.length) {
  ctx.beginPath();
  points.slice(0, upTo).forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
  ctx.stroke();
}

/** An outline at a place in the game (feet at x, y), facing `dir`, `state` on `frame`. False if it isn't there. */
function figure(ctx: CanvasRenderingContext2D, who: string, state: string, frame: number, x: number, y: number, dir: 1 | -1, color: string): boolean {
  const path = outlinePath(figs[who], who, state, frame, S / 4);
  if (!path) return false;
  ctx.save();
  ctx.translate(sx(x), sy(y));
  ctx.scale(dir, 1);
  ctx.fillStyle = color;
  ctx.fill(path, "evenodd");
  ctx.restore();
  return true;
}

function draw(ctx: CanvasRenderingContext2D, g: Game, now: number) {
  const STAGE = g.stage;
  fit(STAGE);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const hit = g.hit;
  const scene = g.scene;
  const f = hit && g.phase !== "idle" ? framesAt(now - g.at) : 0;
  // The camera: close on the two fighters for the move and the freeze, pulling back to the whole stage as the flight
  // starts. Z 1 is the whole stage.
  let zoom = 1;
  let cx = W / 2;
  let cy = H / 2;
  if (hit && scene && (g.phase === "windup" || g.phase === "freeze" || g.phase === "flight")) {
    const mx = sx((scene.ax + hit.x0) / 2);
    const my = sy(9);
    const close = Math.max(1, Math.min(6, (W * 0.55) / (Math.max(30, Math.abs(scene.ax - hit.x0) + 22) * S)));
    const t = g.phase === "flight" ? Math.min(1, f / FLIGHT_ZOOM_FRAMES) : 0;
    const ease = t * t * (3 - 2 * t);
    zoom = close + (1 - close) * ease;
    cx = mx + (W / 2 - mx) * ease;
    cy = my + (H / 2 - my) * ease;
  }
  ctx.setTransform(zoom, 0, 0, zoom, W / 2 - zoom * cx, H / 2 - zoom * cy);
  const line = (w: number) => w / zoom;

  // The blast lines: past them is a KO.
  ctx.strokeStyle = "rgba(255,90,79,0.7)";
  ctx.lineWidth = line(2);
  ctx.setLineDash([8 / zoom, 6 / zoom]);
  ctx.strokeRect(sx(STAGE.left), sy(STAGE.top), (STAGE.right - STAGE.left) * S, (STAGE.top - STAGE.bottom) * S);
  ctx.setLineDash([]);
  // The stage: a slab.
  ctx.fillStyle = "rgba(190,200,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(sx(-STAGE.edge), sy(0));
  ctx.lineTo(sx(STAGE.edge), sy(0));
  ctx.lineTo(sx(STAGE.edge - 22), sy(0) + 40);
  ctx.lineTo(sx(-STAGE.edge + 22), sy(0) + 40);
  ctx.fill();
  ctx.fillStyle = "rgba(190,200,255,0.7)";
  ctx.fillRect(sx(-STAGE.edge), sy(0), STAGE.edge * 2 * S, line(2));
  if (!hit || g.phase === "idle") return;

  // The attacker: their move up to the frame it hits, held through the freeze, then the rest of it.
  const face = hit.facing;
  if (scene) {
    const frame = g.phase === "windup" ? Math.min(scene.hit, f + 1) : g.phase === "freeze" ? scene.hit : scene.hit + f;
    const drawn = frame <= scene.frames ? figure(ctx, scene.attacker, scene.state, frame, scene.ax, scene.ay, face, "#ff6b5e") : figure(ctx, scene.attacker, "Wait", 1, scene.ax, scene.ay, face, "#ff6b5e");
    if (!drawn) {
      ctx.fillStyle = "#ff6b5e";
      ctx.fillRect(sx(scene.ax) - 9, sy(scene.ay) - 34, 18, 34);
    }
    // Samus's Charge Shot, flying in.
    if (scene.shot && g.phase !== "flight" && g.phase !== "result") {
      const k = g.phase === "windup" ? f + 1 - scene.hit : scene.windup - scene.hit;
      if (k >= 0) {
        ctx.fillStyle = "rgba(255, 220, 120, 0.9)";
        ctx.beginPath();
        ctx.arc(sx(scene.shot.x + scene.shot.vx * k), sy(scene.shot.y), scene.shot.radius * S, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (g.phase === "freeze") {
    // The way the hit sends (before any DI), and the held direction.
    const a = ((hit.move.angle === 361 ? 44 : hit.move.angle) * Math.PI) / 180;
    const dirX = Math.cos(a) * face;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = line(3);
    ctx.setLineDash([6 / zoom, 6 / zoom]);
    ctx.beginPath();
    ctx.moveTo(sx(hit.x0), sy(8));
    ctx.lineTo(sx(hit.x0) + (dirX * 90) / zoom, sy(8) - (Math.sin(a) * 90) / zoom);
    ctx.stroke();
    ctx.setLineDash([]);
    if (g.stick.x || g.stick.y) {
      ctx.strokeStyle = "#ffd447";
      ctx.lineWidth = line(4);
      ctx.beginPath();
      ctx.moveTo(sx(hit.x0), sy(8));
      ctx.lineTo(sx(hit.x0) + (g.stick.x * 30) / zoom, sy(8) - (g.stick.y * 30) / zoom);
      ctx.stroke();
    }
  }
  let px = hit.x0;
  let py = 0;
  if (g.solved && g.phase !== "freeze") {
    const mine = g.solved.mine.points;
    const upTo = g.phase === "flight" ? Math.min(mine.length, f + 1) : mine.length;
    ctx.lineWidth = line(2);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.setLineDash([5 / zoom, 6 / zoom]);
    path(ctx, g.solved.none.points);
    ctx.setLineDash([]);
    ctx.lineWidth = line(3);
    ctx.strokeStyle = g.solved.mine.ko && g.phase !== "flight" ? "#ff5a4f" : "#ffd447";
    path(ctx, mine, upTo);
    [px, py] = mine[upTo - 1];
  }
  // You: standing until the hit, then in the hit pose the game picks, shaking through the freeze (flashing), then
  // tumbling along the launch.
  const you: 1 | -1 = face === 1 ? -1 : 1;
  const color = g.phase === "freeze" && Math.floor(f / 3) % 2 ? "#ffffff" : "#ffd447";
  let drawn = false;
  if (scene) {
    if (g.phase === "windup") drawn = figure(ctx, g.victim, "Wait", 1, hit.x0, 0, you, color);
    else if (g.phase === "freeze") drawn = figure(ctx, g.victim, scene.pose, 1, hit.x0 + (f % 2 ? 0.6 : -0.6), 0, you, color);
    else drawn = figure(ctx, g.victim, scene.pose, 1 + (g.phase === "flight" ? f : 999), px, py, you, color);
  }
  if (!drawn) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx(px), sy(py + 8), 9 / zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  // The freeze running out (on the screen, not in the game).
  if (g.phase === "freeze") {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const left = Math.max(0, 1 - f / FREEZE_FRAMES);
    ctx.fillStyle = "#ffd447";
    ctx.fillRect(W / 2 - 72, H - 14, 144 * left, 6);
  }
}

export default function DiSurvival() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [victim, setVictim] = useState<Victim>("fox");
  const [stage, setStage] = useState<StageKey>("fd");
  const game = useRef<Game>({ phase: "idle", hit: null, scene: null, at: 0, solved: null, stick: { x: 0, y: 0 }, analog: false, lives: LIVES, survived: 0, victim: "fox", stage: STAGES.fd });
  useEffect(() => need(victim), [victim]);
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
    game.current.analog = false;
    setHolding(arrow(stick));
  }, []);

  const nextHit = useCallback((now: number) => {
    const g = game.current;
    const hit = dealHit(Math.random, g.victim, g.survived, g.stage);
    // The move as it's shown (round 977): first its startup, then the freeze.
    const scene = hitScene(hit.move.key, g.victim, hit.x0, hit.facing, launchAngle(hit.move, hit.facing), hit.percent, Math.random);
    if (scene) need(scene.attacker);
    const phase = scene && scene.windup > 0 ? "windup" : "freeze";
    Object.assign(g, { phase, hit, scene, at: now, solved: null });
    setHud((h) => ({ ...h, phase, hit, note: null }));
  }, []);

  const playArea = useRef<HTMLDivElement>(null);
  const start = useCallback(() => {
    // On a phone, the picture and the pad in view together (round 980).
    playArea.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    game.current = { phase: "idle", hit: null, scene: null, at: 0, solved: null, stick: game.current.stick, analog: game.current.analog, lives: LIVES, survived: 0, victim, stage: STAGES[stage] };
    setHud({ phase: "freeze", lives: LIVES, survived: 0, hit: null, note: null, newBest: false });
    nextHit(performance.now());
  }, [nextHit, stage, victim]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let id = requestAnimationFrame(function frame(now) {
      const g = game.current;
      const f = framesAt(now - g.at);
      if (g.phase === "windup" && g.scene && f >= g.scene.windup) {
        // The move lands: the freeze starts.
        g.phase = "freeze";
        g.at = now;
        setHud((h) => ({ ...h, phase: "freeze" }));
      } else if (g.phase === "freeze" && g.hit && f >= FREEZE_FRAMES) {
        // The stick is read as the freeze ends, as the game reads it on the last frame of hitlag.
        g.solved = resolveHit(g.hit.move, g.hit.percent, g.victim, g.hit.x0, g.hit.facing, g.stick, g.stage, g.analog);
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
          ? { key: "history.arcade.di.r.died", values: { zone: s.mine.ko, arrow: arrow(s.best.stick), you: arrow(heard(g)) }, good: false }
          : { key: passedTopAlive(s.mine, g.stage) ? "history.arcade.di.r.livedTop" : "history.arcade.di.r.lived", values: { deg: Math.abs(Math.round(s.turned)), you: arrow(heard(g)) }, good: true };
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
  // The on-screen stick, for touch screens (round 985, Matthew: "a DI joystick", any angle): drag the knob; where the
  // thumb is in the stick's circle is the stick, read as the game reads a controller; letting go holds nothing.
  const knob = useRef<HTMLSpanElement>(null);
  const setStick = (stick: Stick, kx: number, ky: number) => {
    game.current.stick = stick;
    game.current.analog = true;
    setHolding(arrow(touchStick(stick)));
    if (knob.current) knob.current.style.transform = `translate(${kx}px, ${ky}px)`;
  };
  const stickAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const reach = r.width * 0.3; // how far the knob travels to the rim
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > reach) {
      dx = (dx / d) * reach;
      dy = (dy / d) * reach;
    }
    setStick({ x: dx / reach, y: -dy / reach }, dx, dy);
  };
  const letGo = () => setStick({ x: 0, y: 0 }, 0, 0);
  const noteText = (n: NonNullable<Hud["note"]>) => t(n.key, "zone" in n.values ? { ...n.values, zone: t(ZONE[n.values.zone as "top" | "side" | "bottom"]) } : n.values);
  const idle = hud.phase === "idle" || hud.phase === "over";

  // Round 972: the character and the stage are picked above the screen (locked while playing); over the screen only
  // the Play button, or the score; the instructions are folded under "How to play".
  const pickStage = (k: StageKey) => {
    setStage(k);
    if (game.current.phase !== "windup" && game.current.phase !== "freeze" && game.current.phase !== "flight") game.current.stage = STAGES[k];
  };
  return (
    <div className="flex flex-col gap-3" style={{ "--tile": GAME_LOOK.di.color } as React.CSSProperties}>
      <div className="flex flex-col gap-3">
        <Picker label={t("history.arcade.di.victim")} options={DI_VICTIMS.map((v) => ({ key: v, label: characterName("melee", v) ?? v, icon: stockIconUrl({ game: "melee", character: v }) }))} value={victim} onPick={setVictim} locked={!idle} />
        <Picker label={t("history.arcade.di.stage")} options={STAGE_KEYS.map((k) => ({ key: k, label: STAGES[k].name }))} value={stage} onPick={pickStage} locked={!idle} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
        <span>{t("history.arcade.di.survived", { n: hud.survived })}</span>
        <span aria-label={t("history.arcade.tech.lives", { n: hud.lives })} className="tracking-widest">
          {Array.from({ length: LIVES }, (_, i) => <span key={i} aria-hidden="true" className={i < hud.lives ? "text-brand" : "text-muted opacity-40"}>●</span>)}
        </span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
      </div>
      <div ref={playArea} className="arcade-play-area flex flex-col gap-3">
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
          <div className="arcade-screen-over absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
            {hud.phase === "over" && hud.newBest && <Confetti />}
            {hud.phase === "over" && (
              <>
                <p className="arcade-pop text-3xl font-black italic tabular-nums">{t("history.arcade.di.survived", { n: hud.survived })}</p>
                {hud.newBest && <p className="arcade-pop badge border border-success text-success">{t("history.arcade.hl.newBest")}</p>}
              </>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={start} className="arcade-promo-btn arcade-start-play">{t(hud.phase === "over" ? "history.arcade.hl.again" : "history.arcade.fq.play")} →</button>
              {hud.phase === "over" && hud.survived > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
            </div>
          </div>
        )}
      </div>
      <div
        aria-hidden="true"
        className={`arcade-stick touch-only touch-none select-none self-center ${holding !== "·" ? "arcade-stick-on" : ""}`}
        onPointerDown={(e) => {
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // not every pointer can be captured; the press still counts
          }
          stickAt(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === "touch") stickAt(e);
        }}
        onPointerUp={letGo}
        onPointerCancel={letGo}
      >
        <span ref={knob} className="arcade-stick-knob">{holding !== "·" ? holding : ""}</span>
      </div>
      </div>
      <p className="keys-only text-meta text-muted">{t("history.arcade.di.keys")}</p>
      <p className="touch-only text-meta text-muted">{t("history.arcade.di.touch")}</p>
      <details className="arcade-start-how">
        <summary>{t("history.arcade.fq.howTo")}</summary>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          <li>{t("history.arcade.di.how")}</li>
          <li>{t("history.arcade.di.tip")}</li>
          <li className="text-meta text-muted">{t("history.arcade.di.maths")}</li>
          <li className="text-meta text-muted">{t("history.arcade.di.outlines")}</li>
          <li className="text-meta text-muted">{t("history.arcade.di.note")}</li>
          <li className="text-meta text-muted">{t("history.arcade.di.stickNote")}</li>
        </ul>
      </details>
    </div>
  );
}
