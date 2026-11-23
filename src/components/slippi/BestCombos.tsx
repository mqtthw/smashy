"use client";
// A player's best combos across the replays they dropped in (round 760): what was landed, on whom,
// for how much, and where to find it again in the replay (file and game clock) so they can record it.
// Read on this device like the rest of the page: nothing is uploaded or saved.
import { useT } from "@/lib/i18n/client";
import type { BestCombo } from "@/lib/slippiStats";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function BestCombos({ combos }: { combos: BestCombo[] }) {
  const t = useT();
  return (
    <section aria-labelledby="best-combos-heading" className="card flex flex-col gap-3 p-4">
      <div>
        <h2 id="best-combos-heading" className="font-bold">{t("play.replays.combos.title")}</h2>
        <p className="text-meta text-muted">{t("play.replays.combos.hint")}</p>
      </div>
      {combos.length === 0 ? (
        <p className="text-sm text-muted">{t("play.replays.combos.none")}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line">
          {combos.map((c, i) => (
            <li key={`${c.file}-${c.seconds}-${i}`} className="flex gap-3 py-2 text-sm">
              <span className="w-5 shrink-0 text-right font-bold tabular-nums text-muted" aria-hidden="true">{i + 1}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold">{t("play.replays.combos.on", { a: c.character, b: c.opponentCharacter })}</span>
                  <span className="text-muted">{c.stage}</span>
                  {c.killed && <span className="badge border border-brand font-normal text-brand">{t("play.replays.combos.kill")}</span>}
                </p>
                <p className="tabular-nums">{t("play.replays.combos.line", { n: c.moves.length, damage: c.damage, from: c.startPercent, to: c.endPercent })}</p>
                <p className="text-muted">{c.moves.join(" → ")}</p>
                <p className="truncate text-meta text-muted">
                  {c.file} · {c.timer ? t("play.replays.combos.timer", { time: c.timer }) : t("play.replays.combos.elapsed", { time: clock(c.seconds) })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
