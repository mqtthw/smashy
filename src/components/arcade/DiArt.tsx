"use client";
// DI Survival's picture (round 991, Matthew: "Update the DI survival card"): one real hit, as the trainer plays it.
// Marth's forward smash tipper meets Fox at 84% on Final Destination (the trainer's own numbers: lib/diSurvival.ts,
// lib/diVisuals.ts). The camera is close for the swing and the freeze while a little stick tilts up and in; then it
// pulls back: the dashed white line is the launch with no DI, out past the blast line, and the ink line is the launch
// with that DI, which lives. The real outlines (lib/outlines.ts), in the cards' two colours (white and ink), on a
// canvas the size of the other pictures (200 x 110). Until the outlines load, or where they aren't served (the
// public copy), the plain picture given as `fallback` shows. With reduced motion: the last frame, both lines drawn.
import { useEffect, useRef, useState } from "react";
import { DI_MOVES, STAGES, launchAngle, resolveHit } from "@/lib/diSurvival";
import { hitScene, type HitScene } from "@/lib/diVisuals";
import { loadOutlines, outlinePath, type Outlines } from "@/lib/outlines";

const W = 200;
const H = 110;
const INK = "#12102e";
const STAGE = STAGES.fd;
const MOVE = DI_MOVES.find((m) => m.key === "marth-fsmash")!;
const X0 = 0;
const PERCENT = 84;
// The loop, in frames.
const IDLE = 24;
const FREEZE = 45;
const ZOOM_OUT = 30;
const HOLD = 50;

type Shot = { scene: HitScene; none: [number, number][]; best: [number, number][]; stick: { x: number; y: number } };
function solve(): Shot | null {
  const angle = launchAngle(MOVE, 1);
  const scene = hitScene(MOVE.key, "fox", X0, 1, angle, PERCENT, () => 0.5);
  if (!scene) return null;
  const r = resolveHit(MOVE, PERCENT, "fox", X0, 1, { x: 0, y: 0 }, STAGE);
  return { scene, none: r.none.points, best: r.best.flight.points, stick: r.best.stick };
}

export default function DiArt({ fallback }: { fallback: React.ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [figs, setFigs] = useState<{ fox: Outlines; marth: Outlines } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loadOutlines("fox"), loadOutlines("marth")]).then(([f, m]) => {
      if (live && f && m) setFigs({ fox: f, marth: m });
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    const shot = solve();
    if (!ctx || !figs || !shot) return;
    const { scene, none, best, stick } = shot;
    const flight = best.length;
    const length = IDLE + scene.windup + FREEZE + flight + HOLD;
    // The two cameras: close on the fighters, and back far enough for both launches and the blast line.
    const close = { x: (scene.ax + X0) / 2, y: 10, s: (W * 0.5) / (Math.abs(scene.ax - X0) + 24) };
    const xs = [...none, ...best].map(([x]) => x).concat(scene.ax - 12, Math.min(STAGE.right + 4, Math.max(...none.map(([x]) => x))));
    const ys = [...none, ...best].map(([, y]) => y).concat(-6);
    const [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const far = { x: (x1 + x2) / 2, y: (y1 + y2) / 2, s: Math.min((W - 16) / (x2 - x1), (H - 14) / (y2 - y1)) };
    const ratio = 2;
    const fig = (o: Outlines, who: string, state: string, frame: number, x: number, y: number, dir: 1 | -1, s: number, color: string) => {
      const p = outlinePath(o, who, state, frame, 0.25); // drawn a game unit to a pixel, then scaled
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
      const swing = k - IDLE; // frames into the move
      const frozen = swing - scene.windup; // frames into the freeze
      const flying = frozen - FREEZE; // frames into the flight
      const e = flying <= 0 ? 0 : Math.min(1, flying / ZOOM_OUT);
      const ease = e * e * (3 - 2 * e);
      const cam = { x: close.x + (far.x - close.x) * ease, y: close.y + (far.y - close.y) * ease, s: close.s + (far.s - close.s) * ease };
      const px = (x: number) => W / 2 + (x - cam.x) * cam.s;
      const py = (y: number) => H / 2 - (y - cam.y) * cam.s;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // The stage, and the side blast line (a dashed ink line) once it's in sight.
      ctx.fillStyle = INK;
      ctx.fillRect(px(-STAGE.edge), py(0), STAGE.edge * 2 * cam.s, Math.max(3, 5 * cam.s));
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px(STAGE.right), 0);
      ctx.lineTo(px(STAGE.right), H);
      ctx.stroke();
      // The launches.
      let at: [number, number] = [X0, 0];
      if (flying > 0) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        none.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
        ctx.stroke();
        const upTo = Math.min(flight, flying);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        best.slice(0, upTo).forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
        ctx.stroke();
        at = best[upTo - 1];
      }
      ctx.setLineDash([]);
      // Marth: standing, then his swing up to the frame it hits, held through the freeze, then the rest of it.
      const mFrame = swing < 0 ? 0 : frozen < 0 ? Math.min(scene.hit, swing + 1) : flying <= 0 ? scene.hit : scene.hit + flying;
      if (mFrame === 0 || mFrame > scene.frames) fig(figs.marth, "marth", "Wait", 1, px(scene.ax), py(scene.ay), 1, cam.s, INK);
      else fig(figs.marth, "marth", scene.state, mFrame, px(scene.ax), py(scene.ay), 1, cam.s, INK);
      // Fox: standing, then in his hit pose, shaking through the freeze, then along the launch.
      const shake = frozen >= 0 && flying <= 0 ? (frozen % 2 ? 0.6 : -0.6) : 0;
      if (frozen < 0) fig(figs.fox, "fox", "Wait", 1, px(X0), py(0), -1, cam.s, "#fff");
      else fig(figs.fox, "fox", scene.pose, 1 + Math.max(0, flying), px(at[0] + shake), py(at[1]), -1, cam.s, "#fff");
      // The stick, from the freeze on: an octagon with its knob tilting to the DI.
      if (frozen >= 0) {
        const tilt = Math.min(1, frozen / 12);
        const len = Math.hypot(stick.x, stick.y) || 1;
        const cx = 18;
        const cy = 17;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i + Math.PI / 8;
          const [x, y] = [cx + Math.cos(a) * 12, cy + Math.sin(a) * 12];
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(cx + (stick.x / len) * 6 * tilt, cy - (stick.y / len) * 6 * tilt, 5, 0, Math.PI * 2);
        ctx.fill();
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
