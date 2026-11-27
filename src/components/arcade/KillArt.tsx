"use client";
// Does it kill?'s card picture (round 1001, Matthew: "Update the card when done"): one real Melee kill, the way the
// quiz now shows it (KillScene.tsx). Captain Falcon's knee (forward air, its kill hit) meets Fox a little past the
// percent it starts to kill from, in the middle of Battlefield (its real shape and platforms, killVisuals.data.ts);
// the hit freezes for the game's hitlag, Fox flies off along the launch the quiz works out (frameGames.ts,
// diSurvival.ts) while the camera pulls back, and a KO flashes at the blast line. The real outlines (kill set),
// in the cards' two colours (white and ink), on a canvas the size of the other pictures (200 x 110). Until the
// outlines load, or where they aren't served (the public copy), the plain picture given as `fallback` shows. With
// reduced motion: the last frame.
import { useEffect, useRef, useState } from "react";
import { sceneFromLook } from "@/lib/diVisuals";
import { STAGES, fly, hitlag, knockback, launchAngle } from "@/lib/diSurvival";
import { killPercent } from "@/lib/frameGames";
import { KILL_LOOKS, STAGE_SHAPES } from "@/lib/killVisuals.data";
import { MELEE_STATS } from "@/lib/characterStats.melee";
import { MELEE_MOVES } from "@/lib/meleeMoves.data";
import { loadOutlines, outlinePath, type Outlines } from "@/lib/outlines";

const W = 200;
const H = 110;
const INK = "#12102e";
const STAGE = STAGES.battlefield;
const SHAPE = STAGE_SHAPES.battlefield;
const KNEE = MELEE_MOVES["captain-falcon"].fair!.kill!;
const LOOK = KILL_LOOKS["captain-falcon-fair"];
// The loop, in frames.
const IDLE = 24;
const ZOOM_OUT = 26;
const HOLD = 60;

function solve() {
  const from = killPercent(KNEE, "fox", "battlefield");
  if (from === null) return null;
  const percent = from + 6;
  const angle = launchAngle(KNEE, 1);
  const flight = fly(knockback(KNEE, percent, MELEE_STATS.fox.weight ?? 100), angle, "fox", 0, STAGE);
  const [x1, y1] = flight.points[Math.min(1, flight.points.length - 1)];
  const scene = sceneFromLook(LOOK, "fox", 0, 1, (Math.atan2(y1, x1) * 180) / Math.PI, percent, () => 0.5);
  return scene ? { scene, flight, percent } : null;
}

export default function KillArt({ fallback }: { fallback: React.ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [figs, setFigs] = useState<{ falcon: Outlines; fox: Outlines } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loadOutlines("captain-falcon", "kill"), loadOutlines("fox", "kill")]).then(([c, f]) => {
      if (live && c && f) setFigs({ falcon: c, fox: f });
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    const shot = solve();
    if (!ctx || !figs || !shot) return;
    const { scene, flight } = shot;
    const pts = flight.points;
    const freeze = hitlag(KNEE.damage);
    const length = IDLE + scene.windup + freeze + pts.length + HOLD;
    const closeW = 2 * Math.max(...SHAPE.body.map(([x]) => Math.abs(x))) + 20;
    const close = { x: 0, y: 26, s: Math.min(W / closeW, H / 100) };
    const far = { x: 0, y: (STAGE.top + STAGE.bottom) / 2, s: Math.min((W - 8) / (STAGE.right - STAGE.left), (H - 8) / (STAGE.top - STAGE.bottom)) };
    const ratio = 2;
    const fig = (o: Outlines, who: string, state: string, frame: number, x: number, y: number, dir: 1 | -1, s: number, color: string) => {
      const p = outlinePath(o, who, state, frame, 0.25);
      if (!p) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir * s, s);
      ctx.fillStyle = color;
      ctx.fill(p, "evenodd");
      ctx.restore();
    };
    const drawAt = (t: number) => {
      const k = t % length;
      const swing = k - IDLE;
      const frozen = swing - scene.windup;
      const flying = frozen - freeze;
      const e = flying <= 0 ? 0 : Math.min(1, flying / ZOOM_OUT);
      const ease = e * e * (3 - 2 * e);
      const cam = { x: close.x + (far.x - close.x) * ease, y: close.y + (far.y - close.y) * ease, s: close.s + (far.s - close.s) * ease };
      const px = (x: number) => W / 2 + (x - cam.x) * cam.s;
      const py = (y: number) => H / 2 - (y - cam.y) * cam.s;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Battlefield: its body and platforms, in ink; the blast lines dashed.
      ctx.fillStyle = INK;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      SHAPE.body.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      for (const p of SHAPE.platforms) {
        ctx.beginPath();
        p.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
        ctx.stroke();
      }
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(px(STAGE.left), py(STAGE.top), (STAGE.right - STAGE.left) * cam.s, (STAGE.top - STAGE.bottom) * cam.s);
      ctx.setLineDash([]);
      // The launch, drawn as Fox flies.
      let at: [number, number] = [0, 0];
      if (flying > 0) {
        const upTo = Math.min(pts.length, flying);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        pts.slice(0, upTo).forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
        ctx.stroke();
        at = pts[upTo - 1];
      }
      // Falcon: standing, the knee up to its hit, held through the freeze, the rest of it, then standing.
      const fFrame = swing < 0 ? 0 : frozen < 0 ? Math.min(scene.hit, swing + 1) : flying <= 0 ? scene.hit : scene.hit + flying;
      if (fFrame === 0 || fFrame > scene.frames) fig(figs.falcon, "captain-falcon", "Wait", 1, px(scene.ax), py(0), 1, cam.s, INK);
      else fig(figs.falcon, "captain-falcon", scene.state, fFrame, px(scene.ax), py(scene.ay), 1, cam.s, INK);
      // Fox: standing, his hit pose shaking through the freeze, then along the launch.
      const shake = frozen >= 0 && flying <= 0 ? (frozen % 2 ? 0.6 : -0.6) : 0;
      if (frozen < 0) fig(figs.fox, "fox", "Wait", 1, px(0), py(0), -1, cam.s, "#fff");
      else if (flying < pts.length) fig(figs.fox, "fox", scene.pose, 1 + Math.max(0, flying), px(at[0] + shake), py(at[1]), -1, cam.s, "#fff");
      // The KO, where he crossed the line.
      if (flying >= pts.length && flight.ko) {
        const [ex, ey] = pts.at(-1)!;
        const x = Math.min(W - 24, Math.max(24, px(ex)));
        const y = Math.min(H - 10, Math.max(26, py(ey)));
        const grow = Math.min(1, (flying - pts.length) / 10);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px(ex), py(ey), 6 + 10 * grow, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "italic 900 22px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = INK;
        ctx.strokeText("KO!", x, y);
        ctx.fillStyle = "#fff";
        ctx.fillText("KO!", x, y);
      }
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drawAt(length - 1);
      return;
    }
    const start = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      drawAt(Math.floor(((now - start) * 60) / 1000));
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [figs]);
  if (!figs) return <>{fallback}</>;
  return <canvas ref={canvas} width={W * 2} height={H * 2} aria-hidden="true" />;
}
