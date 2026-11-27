"use client";
// The powershield trainer (round 950): Falco (right) fires lasers; raise the shield (hold Space) so the laser
// arrives in the shield's first two frames and is sent back. Up too early and it is only blocked; too late and
// it hits. Letting go takes 15 frames before the shield can come up again, as in the game, so mashing doesn't
// work. Counted in Melee's frames (lib/powershield.ts, with its sources and what isn't the game's). Three
// stocks; the best run is kept in this browser. Plain shapes only.
import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { characterName } from "@/lib/characters";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { NO_SHIELD, PS_LIVES, arrivesAt, SHOOTERS, drop, judgeShot, leavesAt, newShot, raise, type Shield, type Shooter, type Shot, type Verdict } from "@/lib/powershield";
import { framesAt } from "@/lib/techChase";
import { useStoredState } from "@/lib/useStoredState";

const W = 640;
const H = 240;
const GROUND = 190;
const ME = 110;
const FALCO = 560;

type Game = { phase: "idle" | "play" | "over"; t0: number; speed: number; shot: Shot | null; judged: boolean; verdict: Verdict | null; verdictAt: number; shield: Shield; lives: number; reflects: number; streak: number; shooter: Shooter };
const fresh = (speed: number, shooter: Shooter = "falco"): Game => ({ shooter, phase: "idle", t0: 0, speed, shot: null, judged: false, verdict: null, verdictAt: 0, shield: NO_SHIELD, lives: PS_LIVES, reflects: 0, streak: 0 });
type Hud = { phase: Game["phase"]; lives: number; reflects: number; note: { key: MessageKey; n: number; good: boolean } | null; newBest: boolean };

function draw(ctx: CanvasRenderingContext2D, g: Game, f: number) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(190,200,255,0.10)";
  ctx.fillRect(40, GROUND, W - 80, 10);
  ctx.fillStyle = "rgba(190,200,255,0.35)";
  ctx.fillRect(40, GROUND, W - 80, 2);
  const figure = (x: number, color: string, facing: 1 | -1, arm: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 14, GROUND);
    ctx.lineTo(x + 14, GROUND);
    ctx.lineTo(x + 10, GROUND - 46);
    ctx.lineTo(x - 10, GROUND - 46);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, GROUND - 58, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(facing === 1 ? x + 8 : x - 8 - arm, GROUND - 40, arm, 8);
  };
  const shot = g.shot;
  // The shooter: the arm comes up over the frames before the laser leaves (23 for Falco, 12 for Fox).
  const wind = shot && g.phase === "play" ? Math.max(0, Math.min(1, (f - shot.start) / shot.out)) : 0;
  figure(FALCO, g.shooter === "fox" ? "#ffa040" : "#6aa7ff", -1, 6 + wind * 24);
  figure(ME, g.verdict?.kind === "hit" && f - g.verdictAt < 20 ? "#ff5a4f" : "#ffd447", 1, 8);
  // The shield: white on its first two frames (the reflect), then blue.
  if (g.shield.since !== null && g.phase === "play") {
    const sf = f - g.shield.since + 1;
    ctx.fillStyle = sf <= 2 ? "rgba(255,255,255,0.85)" : "rgba(90,209,255,0.45)";
    ctx.strokeStyle = sf <= 2 ? "#ffffff" : "#5ad1ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ME, GROUND - 34, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (!shot || g.phase !== "play") return;
  const y = GROUND - 38;
  const gap = FALCO - 40 - (ME + 44);
  if (!g.judged && f >= leavesAt(shot)) {
    const p = (f - leavesAt(shot)) / shot.travel;
    const x = FALCO - 40 - gap * p;
    ctx.fillStyle = "#ff4b4b";
    ctx.fillRect(x, y - 3, 46, 6);
  } else if (g.judged && g.verdict?.kind === "reflect") {
    const x = ME + 44 + (f - g.verdictAt) * 22; // sent back
    if (x < FALCO) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y - 3, 46, 6);
    }
  }
}

export default function Powershield() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [half, setHalf] = useState(false);
  const [shooter, setShooter] = useState<Shooter>("falco");
  const game = useRef<Game>(fresh(1));
  const [bestStored, setBest] = useStoredState("arcade.ps.best", "0");
  const best = Number(bestStored) || 0;
  const bestRef = useRef(best);
  useEffect(() => {
    bestRef.current = best;
  }, [best]);
  const [hud, setHud] = useState<Hud>({ phase: "idle", lives: PS_LIVES, reflects: 0, note: null, newBest: false });
  const frameNow = () => framesAt(performance.now() - game.current.t0, game.current.speed);

  const start = useCallback(() => {
    const g = (game.current = fresh(half ? 0.5 : 1, shooter));
    g.phase = "play";
    g.t0 = performance.now();
    g.shot = newShot(30, 0, Math.random, shooter);
    setHud({ phase: "play", lives: PS_LIVES, reflects: 0, note: null, newBest: false });
  }, [half, shooter]);

  const press = useCallback(
    (down: boolean) => {
      const g = game.current;
      if (g.phase !== "play") {
        if (down) start();
        return;
      }
      g.shield = down ? raise(g.shield, frameNow()) : drop(g.shield, frameNow());
    },
    [start],
  );

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let id = requestAnimationFrame(function frame() {
      const g = game.current;
      const f = g.phase === "play" ? frameNow() : 0;
      if (g.phase === "play" && g.shot) {
        if (!g.judged && f >= arrivesAt(g.shot)) {
          // Judged on the frame it arrives, whatever frame the screen got round to drawing.
          const v = judgeShot(g.shield, arrivesAt(g.shot));
          g.judged = true;
          g.verdict = v;
          g.verdictAt = arrivesAt(g.shot);
          if (v.kind === "reflect") {
            g.reflects++;
            g.streak++;
          } else {
            g.streak = 0;
            if (v.kind === "hit") g.lives--;
          }
          const note = v.kind === "reflect" ? { key: "history.arcade.ps.r.reflect" as const, n: v.shieldFrame, good: true } : v.kind === "block" ? { key: "history.arcade.ps.r.block" as const, n: v.early, good: false } : { key: "history.arcade.ps.r.hit" as const, n: 0, good: false };
          setHud((h) => ({ ...h, lives: g.lives, reflects: g.reflects, note }));
        } else if (g.judged && f >= g.verdictAt + 40) {
          if (g.lives <= 0) {
            g.phase = "over";
            const newBest = g.speed === 1 && g.reflects > bestRef.current;
            if (newBest) setBest(String(g.reflects));
            setHud((h) => ({ ...h, phase: "over", newBest }));
          } else {
            g.shot = newShot(f, g.reflects, Math.random, g.shooter);
            g.judged = false;
          }
        }
      }
      draw(ctx, g, f);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [setBest]);

  useEffect(() => {
    const ok = (e: KeyboardEvent) => e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    const down = (e: KeyboardEvent) => {
      if (!ok(e)) return;
      e.preventDefault();
      if (!e.repeat) press(true);
    };
    const up = (e: KeyboardEvent) => {
      if (ok(e)) press(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [press]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${t("history.arcade.ps.shareText", { n: hud.reflects })}\nhttps://smashy.gg/arcade/powershield`);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
        <span>{t("history.arcade.ps.reflects", { n: hud.reflects })}</span>
        <span aria-label={t("history.arcade.tech.lives", { n: hud.lives })} className="tracking-widest">
          {Array.from({ length: PS_LIVES }, (_, i) => <span key={i} aria-hidden="true" className={i < hud.lives ? "text-brand" : "text-muted opacity-40"}>●</span>)}
        </span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
      </div>
      <div className="card relative overflow-hidden">
        <canvas ref={canvas} width={W} height={H} className="block h-auto w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3" role="status">
          {hud.phase === "play" && hud.note && <p key={`${hud.reflects}-${hud.lives}-${hud.note.key}-${hud.note.n}`} className={`arcade-pop badge border bg-overlay px-3 py-1 text-sm ${hud.note.good ? "border-success text-success" : "border-danger"}`}>{t(hud.note.key, { n: hud.note.n })}</p>}
        </div>
        {hud.phase !== "play" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-overlay p-4 text-center">
            {hud.phase === "over" && hud.newBest && <Confetti />}
            {hud.phase === "over" ? (
              <>
                <p className="arcade-pop text-3xl font-black italic tabular-nums">{t("history.arcade.ps.reflects", { n: hud.reflects })}</p>
                {hud.newBest && <p className="arcade-pop badge border border-success text-success">{t("history.arcade.hl.newBest")}</p>}
              </>
            ) : (
              <p className="max-w-md text-sm">{t("history.arcade.ps.how")}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-meta">{t("history.arcade.ps.shooter")}</span>
              {(Object.keys(SHOOTERS) as Shooter[]).map((k) => (
                <button key={k} type="button" onClick={() => setShooter(k)} aria-pressed={shooter === k} className={`chip py-1 text-meta ${shooter === k ? "border-brand text-brand" : ""}`}>{characterName("melee", k)}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={start} className="btn btn-md btn-inverse">{t(hud.phase === "over" ? "history.arcade.hl.again" : "history.arcade.tech.start")}</button>
              {hud.phase === "over" && hud.reflects > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
            </div>
            <label className="flex items-center gap-2 text-meta">
              <input type="checkbox" checked={half} onChange={(e) => setHalf(e.target.checked)} />
              {t("history.arcade.tech.half")}
            </label>
          </div>
        )}
      </div>
      <button type="button" onPointerDown={(e) => { e.preventDefault(); press(true); }} onPointerUp={() => press(false)} onPointerLeave={() => game.current.phase === "play" && press(false)} className="btn btn-md btn-inverse touch-none select-none">{t("history.arcade.ps.shieldBtn")}</button>
      <ul className="flex flex-col gap-1 text-meta text-muted">
        <li>{t("history.arcade.ps.keys")}</li>
        <li>{t("history.arcade.ps.frames")}</li>
        <li>{t("history.arcade.ps.note")}</li>
      </ul>
    </div>
  );
}
