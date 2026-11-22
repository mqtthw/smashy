"use client";

import { useState, useTransition } from "react";
import { clearPicks, savePicks } from "@/app/pickem/actions";
import type { Seed } from "@/lib/pickem";
import { useT } from "@/lib/i18n/client";

/**
 * Make or change your picks: tap players to put them in your top 8 (up to 8), and mark one of them
 * as your champion. Saved on the server; changeable until the event starts.
 */
export default function PickForm({ eventId, seeds, saved }: { eventId: string; seeds: Seed[]; saved: { champion: string; top8: string[] } | null }) {
  const [top8, setTop8] = useState<string[]>(saved?.top8 ?? []);
  const t = useT();
  const [champion, setChampion] = useState<string | null>(saved?.champion ?? null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const tagOf = new Map(seeds.map((s) => [s.playerId, s.tag]));
  const toggle = (id: string) => {
    setNote(null);
    setError(null);
    if (top8.includes(id)) {
      setTop8(top8.filter((x) => x !== id));
      if (champion === id) setChampion(null);
    } else if (top8.length < 8) {
      setTop8([...top8, id]);
      if (!champion) setChampion(id);
    } else setError(t("play.pickem.full"));
  };
  const run = (fn: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      setError(null);
      setNote(null);
      try {
        const res = await fn();
        if (res.error) setError(res.error);
        else setNote(done);
      } catch {
        setError(t("common.offline"));
      }
    });

  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="your-picks">
      <div>
        <h2 id="your-picks" className="font-bold">{saved ? t("play.pickem.yourPicks") : t("play.pickem.makePicks")}</h2>
        <p className="text-meta text-muted">
          {t("play.pickem.howTo")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-sm" aria-live="polite">
        <span className="text-muted">{t("play.pickem.top8Count", { n: top8.length })}</span>
        {top8.length ? (
          top8.map((id) => (
            <span key={id} className="badge border border-line">
              <button type="button" onClick={() => setChampion(id)} aria-label={t("play.pickem.makeChampion", { name: tagOf.get(id) ?? "" })} aria-pressed={champion === id} className={champion === id ? "text-brand" : "text-muted"}>
                ★
              </button>{" "}
              {tagOf.get(id)}
            </span>
          ))
        ) : (
          <span className="text-muted">{t("play.pickem.nobodyPicked")}</span>
        )}
      </div>
      {champion && (
        <p className="text-sm">
          {t("play.pickem.champion")} <b>{tagOf.get(champion)}</b>
        </p>
      )}
      <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {seeds.map((s) => {
          const on = top8.includes(s.playerId);
          return (
            <li key={s.playerId}>
              <button
                type="button"
                onClick={() => toggle(s.playerId)}
                aria-pressed={on}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm ${on ? "border-brand bg-brand/10" : "border-line hover:bg-surface"}`}
              >
                <span className="w-6 shrink-0 text-right font-mono text-meta text-muted">{s.seed}</span>
                <span className="min-w-0 flex-1 truncate">
                  {s.prefix && <span className="text-muted">{s.prefix} | </span>}
                  <b>{s.tag}</b>
                </span>
                {on && <span className="shrink-0 text-meta text-brand">{champion === s.playerId ? t("play.pickem.championTag") : t("play.pickem.in")}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || !champion} onClick={() => champion && run(() => savePicks(eventId, champion, top8), t("play.pickem.saved"))} className="btn btn-md btn-primary">
          {pending ? t("common.saving") : saved ? t("play.pickem.saveChanges") : t("play.pickem.save")}
        </button>
        {saved && (
          <button type="button" disabled={pending} onClick={() => window.confirm(t("play.pickem.clearConfirm")) && run(() => clearPicks(eventId), t("play.pickem.cleared"))} className="text-sm text-muted underline">
            {t("play.pickem.clear")}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {note && <p role="status" className="text-sm text-muted">{note}</p>}
    </section>
  );
}
