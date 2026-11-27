"use client";
// Does it kill?'s picture for Melee (round 1001, Matthew: "rework the Does it Kill? game to have accurate visuals for
// melee"). Everything drawn is the game's: the stage's own shape and platforms (its collision, killVisuals.data.ts),
// the attacker doing the real move with its outline frame by frame (build-kill.mjs), placed the DI trainer's way so
// the move's kill hitbox, on the frame it comes out, is on the victim (diVisuals.ts sceneFromLook), and the victim's
// hit pose as the game picks it. Before the answer: both stand on the stage and the move plays up to the frame it
// connects, over and over, with the percent over the victim. After: the hit freezes for the game's hitlag (damage / 3
// + 3, at most 20 frames), then the victim flies along the launch the quiz worked out (diSurvival.ts) while the
// camera pulls back to the blast lines; a KO flashes where it crosses one; the best DI's stick shows in the corner.
// Where the outlines aren't served (the public copy) the fighters are plain dots. With reduced motion: still frames.
import { useEffect, useRef, useState } from "react";
import { hurtboxesAt, sceneFromLook } from "@/lib/diVisuals";
import { hitlag } from "@/lib/diSurvival";
import { KILL_LOOKS, STAGE_SHAPES } from "@/lib/killVisuals.data";
import { loadOutlines, outlinePath, type Outlines } from "@/lib/outlines";
import type { KillView } from "@/lib/ultimateKill";
import { MELEE_MOVES, type MoveChar, type MoveKey } from "@/lib/meleeMoves.data";

const W = 640;
const H = 340;
const RED = "#ff6b5e";
const GOLD = "#ffd447";
const WIDE = 36; // frames the whole stage shows before the camera moves in (before the answer)
const ZOOM_IN = 24; // frames the camera takes to move in on the fighters
const IDLE = WIDE + ZOOM_IN; // frames both stand before the move starts (before the answer)
const HOLD = 70; // frames the contact is held before it loops (before the answer)
const ZOOM_OUT = 40; // frames the camera takes to pull back once the flight starts

export default function KillScene({ q, answered, dialLabel }: { q: KillView; answered: boolean; dialLabel: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [figs, setFigs] = useState<{ a: Outlines | null; v: Outlines | null } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loadOutlines(q.attacker, "kill"), loadOutlines(q.victim, "kill")]).then(([a, v]) => live && setFigs({ a, v }));
    return () => {
      live = false;
    };
  }, [q.attacker, q.victim]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || !figs) return;
    const look = KILL_LOOKS[`${q.attacker}-${q.move}`];
    const shape = STAGE_SHAPES[q.stageKey!];
    const s = q.stage;
    const pts = q.flight.points;
    // The launch's direction as flown (the Sakurai angle already resolved), for the hit pose.
    const [x1, y1] = pts[Math.min(1, pts.length - 1)];
    const launchDeg = (Math.atan2(y1 - pts[0][1], x1 - pts[0][0]) * 180) / Math.PI;
    // From 100%, the game rolls the dice for the spinning pose; here the same question always shows the same one.
    const scene = sceneFromLook(look, q.victim, 0, 1, launchDeg, q.percent, () => ((q.percent * 7) % 10) / 10);
    if (!scene) return;
    // A hit from behind (back airs, and a couple of hits just behind the head): done facing away, it sends the way the
    // attacker's back faces. So the attacker stands on the left facing left, mirrored about the victim's middle.
    const boxes = hurtboxesAt(q.victim, 0, -1);
    const tx = boxes.length ? boxes.reduce((sum, b) => sum + (b[0] + b[2]) / 2, 0) / boxes.length : 0;
    const back = scene.ax > tx;
    const ax = back ? 2 * tx - scene.ax : scene.ax;
    const face: 1 | -1 = back ? -1 : 1;
    const damage = MELEE_MOVES[q.attacker as MoveChar]?.[q.move as MoveKey]?.kill?.damage ?? 10;
    const freeze = hitlag(damage);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Cameras: the whole main stage, close on the fighters, and the blast lines.
    const edge = Math.max(...shape.body.map(([x]) => Math.abs(x)));
    // Close enough to read the move (the fighters about a third of the picture tall), never past the stage's ends.
    const closeW = Math.min(edge * 2 + 50, Math.max(110, Math.abs(ax - tx) * 2 + 70));
    const close = { x: (ax + tx) / 2, y: 16, s: Math.min(W / closeW, H / (closeW * 0.55)) };
    const wideW = edge * 2 + 50;
    const wide = { x: 0, y: 8, s: Math.min(W / wideW, H / (wideW * 0.55)) };
    const farW = s.right - s.left + 24;
    const farH = s.top - s.bottom + 24;
    const far = { x: (s.left + s.right) / 2, y: (s.top + s.bottom) / 2, s: Math.min(W / farW, H / farH) };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = W * dpr;
    el.height = H * dpr;

    const draw = (f: number) => {
      // Where the story is at frame f.
      const windupEnd = (answered ? 0 : IDLE) + scene.windup;
      const before = !answered;
      const t = before ? f % (windupEnd + HOLD) : f;
      const moveFrame = before ? (t < IDLE ? 0 : Math.min(scene.hit, t - IDLE + 1)) : t < scene.windup ? t + 1 : t < scene.windup + freeze ? scene.hit : scene.hit + (t - scene.windup - freeze);
      const flightF = before ? -1 : t - scene.windup - freeze;
      const smooth = (v: number) => v * v * (3 - 2 * v);
      // Before the answer: the whole stage, then in on the fighters for the move. After: back out to the blast lines.
      const to = before ? wide : far;
      const e = before ? (t < WIDE ? 1 : t < IDLE ? 1 - smooth((t - WIDE) / ZOOM_IN) : 0) : flightF < 0 ? 0 : smooth(Math.min(1, flightF / ZOOM_OUT));
      const cam = { x: close.x + (to.x - close.x) * e, y: close.y + (to.y - close.y) * e, s: close.s + (to.s - close.s) * e };
      const sx = (x: number) => W / 2 + (x - cam.x) * cam.s;
      const sy = (y: number) => H / 2 - (y - cam.y) * cam.s;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // The blast lines.
      ctx.strokeStyle = "rgba(255,90,79,0.75)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(sx(s.left), sy(s.top), (s.right - s.left) * cam.s, (s.top - s.bottom) * cam.s);
      ctx.setLineDash([]);
      // The stage: its body, its top edge brighter, and its platforms.
      ctx.fillStyle = "rgba(190,200,255,0.2)";
      ctx.strokeStyle = "rgba(190,200,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      shape.body.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(190,200,255,0.85)";
      for (const p of shape.platforms) {
        ctx.beginPath();
        p.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
        ctx.stroke();
      }
      // The stage's name.
      ctx.fillStyle = "rgba(190,200,255,0.8)";
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(s.name, 12, 22);

      const figure = (o: Outlines | null, who: string, state: string, frame: number, x: number, y: number, dir: 1 | -1, color: string) => {
        const path = outlinePath(o, who, state, frame, cam.s / 4);
        ctx.save();
        ctx.translate(sx(x), sy(y));
        if (path) {
          ctx.scale(dir, 1);
          ctx.fillStyle = color;
          ctx.fill(path, "evenodd");
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(0, -8 * cam.s, 7 * cam.s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      // The attacker: standing, the move, held through the freeze, the rest of the move, then standing.
      if (moveFrame >= 1 && moveFrame <= scene.frames) figure(figs.a, q.attacker, scene.state, moveFrame, ax, scene.ay, face, RED);
      else figure(figs.a, q.attacker, "Wait", 1, ax, 0, face, RED);

      // The launch and the victim.
      let vx = 0;
      let vy = 0;
      if (flightF >= 0) {
        const upTo = Math.min(pts.length, flightF + 1);
        if (q.hard) {
          ctx.strokeStyle = "rgba(255,255,255,0.45)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 7]);
          ctx.beginPath();
          q.noDi.points.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.strokeStyle = q.kills ? "#ff5a4f" : GOLD;
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        pts.slice(0, upTo).forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
        ctx.stroke();
        [vx, vy] = pts[upTo - 1];
        figure(figs.v, q.victim, scene.pose, 1 + flightF, vx, vy, -1, GOLD);
        const done = flightF >= pts.length - 1;
        if (done && q.kills) {
          const [ex, ey] = pts.at(-1)!;
          const pulse = Math.min(1, (flightF - pts.length + 1) / 12);
          ctx.strokeStyle = "#ff5a4f";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(sx(ex), sy(ey), (10 + 14 * pulse) * Math.max(1, cam.s * 2), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#ff5a4f";
          ctx.font = "italic 900 34px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("KO!", Math.max(50, Math.min(W - 50, sx(ex))), Math.max(46, Math.min(H - 16, sy(ey) + 52)));
        }
      } else if (!before && t >= scene.windup) {
        // The freeze: the hit pose, shaking.
        figure(figs.v, q.victim, scene.pose, 1, (t % 2 ? 0.5 : -0.5), 0, -1, Math.floor(t / 3) % 2 ? "#ffffff" : GOLD);
      } else {
        figure(figs.v, q.victim, "Wait", 1, 0, 0, -1, GOLD);
      }
      // The percent, before the answer.
      if (before) {
        ctx.font = "italic 900 30px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#12102e";
        ctx.strokeText(`${q.percent}%`, sx(0), sy(30));
        ctx.fillStyle = GOLD;
        ctx.fillText(`${q.percent}%`, sx(0), sy(30));
      }
      // The best DI's stick, after the answer: in the middle when holding nothing is best.
      if (!before && flightF >= 0) {
        const r = 30;
        const cx = W - 52;
        const cy = 54;
        const a = q.stickAngle === null ? null : (q.stickAngle * Math.PI) / 180;
        ctx.globalAlpha = Math.min(1, flightF / 15);
        ctx.fillStyle = "rgba(10,8,40,0.75)";
        ctx.strokeStyle = "rgba(190,200,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const ex = a === null ? 0 : Math.cos(a) * r * 0.85;
        const ey = a === null ? 0 : -Math.sin(a) * r * 0.85;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + ex, cy + ey);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(cx + ex, cy + ey, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(190,200,255,0.9)";
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(dialLabel, cx, cy + r + 16);
        ctx.globalAlpha = 1;
      }
    };

    if (reduce) {
      draw(answered ? scene.windup + freeze + pts.length + 30 : IDLE + scene.windup + 1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      draw(Math.floor(((now - start) * 60) / 1000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [figs, q, answered, dialLabel]);

  return <canvas ref={canvas} role="img" aria-label={q.stage.name} className="arcade-pop card block w-full" style={{ aspectRatio: `${W} / ${H}` }} />;
}
