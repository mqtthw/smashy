"use client";
// The tech-chase trainer's picture (round 976, Matthew: "Now can we update the Techchase Trainer Card"): the real
// outlines the trainer uses (lib/outlines.ts), moving. Fox techs in place, rolls forward, stands, rolls back, misses
// a tech and gets up, on the game's own frames and roll paths (techChase.data.ts); Marth waits to chase. Drawn in the
// cards' two colours (white and ink) on a canvas the size of the other pictures (200 x 110). Until the outlines
// load, or where they aren't served (the public copy), the plain picture given as `fallback` shows. With reduced
// motion: one frame, mid-roll.
import { useEffect, useRef, useState } from "react";
import { loadOutlines, outlinePath, type Outlines } from "@/lib/outlines";
import { TECH_DATA } from "@/lib/techChase.data";

const W = 200;
const H = 110;
const GROUND = 100;
const SCALE = 0.95; // pixels a stored point: Fox about 62 pixels tall
const OPP_X = 128;
const MARTH_X = 46;
const ROLL = 44; // pixels a roll travels here (the trainer's spots are further apart)
const fox = TECH_DATA.fox;
// The loop: [the game's state, how many frames, which way it rolls].
const LOOP: [state: string, frames: number, roll: number][] = [
  ["Passive", fox.tech.frames, 0],
  ["Wait", 24, 0],
  ["PassiveStandF", fox.techRoll.frames, 1],
  ["Wait", 24, 0],
  ["PassiveStandB", fox.techRoll.frames, -1],
  ["Wait", 24, 0],
  ["DownBoundU", fox.bounce.up, 0],
  ["DownWaitU", 20, 0],
  ["DownStandU", fox.up.stand.frames, 0],
  ["Wait", 30, 0],
];
const LENGTH = LOOP.reduce((n, [, f]) => n + f, 0);

/** Where the loop is on frame `t`: the state, its frame and how far across Fox is. */
function at(t: number): { state: string; frame: number; x: number } {
  let x = 0;
  let k = t % LENGTH;
  for (const [state, frames, roll] of LOOP) {
    if (k < frames) {
      const path = roll === 1 ? fox.techRoll.path : roll === -1 ? fox.techRoll.pathBack : null;
      return { state, frame: k + 1, x: x + (path ? roll * ROLL * path[Math.min(path.length - 1, k)] : 0) };
    }
    x += roll * ROLL;
    k -= frames;
  }
  return { state: "Wait", frame: 1, x: 0 };
}

export default function TechChaseArt({ fallback }: { fallback: React.ReactNode }) {
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
    if (!ctx || !figs) return;
    const ratio = 2;
    const ink = "#12102e";
    const drawAt = (t: number) => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = ink;
      ctx.fillRect(14, GROUND, 172, 5);
      const m = outlinePath(figs.marth, "marth", "Wait", 1, SCALE);
      if (m) {
        ctx.save();
        ctx.translate(MARTH_X, GROUND);
        ctx.fill(m, "evenodd");
        ctx.restore();
      }
      const now = at(t);
      const f = outlinePath(figs.fox, "fox", now.state, now.frame, SCALE);
      if (f) {
        ctx.save();
        ctx.translate(OPP_X + now.x, GROUND);
        ctx.fillStyle = "#fff";
        ctx.fill(f, "evenodd");
        ctx.restore();
      }
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drawAt(fox.tech.frames + 24 + 20); // mid forward roll
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
