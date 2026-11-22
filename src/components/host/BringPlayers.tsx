"use client";

import { placeKey as ordinalKey } from "@/lib/i18n/base";
import { useState, useTransition } from "react";
import { bringPlayers, previewBringPlayers, undoBringPlayers, type BringPreview } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

// Which ending a place takes in English ("1st", "12th"); each language fills in its own.

export type BringSource = { id: string; label: string; started: boolean; cut: number };

/**
 * Host tool, on a bracket that hasn't started: bring players over from another bracket of the same
 * event. Made for a Redemption bracket (everyone who went out of the main bracket early), and also
 * copies a whole field. Look at who would come over, then add them; Undo takes them back out.
 */
export default function BringPlayers({ eventId, sources }: { eventId: string; sources: BringSource[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(sources[0]?.id ?? "");
  const source = sources.find((s) => s.id === from) ?? sources[0];
  const [who, setWho] = useState<"out" | "all">(source?.started ? "out" : "all");
  const [cut, setCut] = useState(String(source?.cut ?? 9));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<(BringPreview & { cut: number | null; fromId: string }) | null>(null);
  const [done, setDone] = useState<{ added: number; accounts: string[]; guests: string[] } | null>(null);
  if (!source) return null;

  const cutNow = (): number | null => (who === "out" ? Math.round(Number(cut)) : null);
  const look = () =>
    start(async () => {
      setError(null);
      setNote(null);
      setPreview(null);
      const c = cutNow();
      if (c !== null && !(c >= 2 && c <= 512)) {
        setError(t("hostrun.bring.cutRange"));
        return;
      }
      try {
        const res = await previewBringPlayers(eventId, source.id, c);
        if (res.preview) setPreview({ ...res.preview, cut: c, fromId: source.id });
        setError(res.error ?? null);
      } catch {
        setError(t("common.offline"));
      }
    });
  const add = () => {
    if (!preview) return;
    const { fromId, cut: c } = preview;
    start(async () => {
      setError(null);
      try {
        setDone(null); // an earlier add can't be undone from here anymore
        const res = await bringPlayers(eventId, fromId, c);
        if (res.error || !res.added) {
          setError(res.error ?? t("hostrun.addPlayersFailed"));
          return;
        }
        setDone({ added: res.added, accounts: res.accounts ?? [], guests: res.guests ?? [] });
        setPreview(null);
      } catch {
        setError(t("common.offline"));
      }
    });
  };
  const undo = () => {
    if (!done) return;
    const { added, accounts, guests } = done;
    start(async () => {
      setError(null);
      try {
        const res = await undoBringPlayers(eventId, accounts, guests);
        if (res.error) {
          setError(res.error);
          return;
        }
        setDone(null);
        setNote(t("hostrun.removedCameOver", { n: added }));
      } catch {
        setError(t("common.offline"));
      }
    });
  };
  // Changing what's asked for throws away an old preview, so "Add" always matches what's on screen.
  const change = (fn: () => void) => {
    fn();
    setPreview(null);
    setError(null);
  };

  return (
    <details className="card p-4" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-bold">{t("hostrun.bring.title")}</summary>
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-sm text-muted">
          {t("hostrun.bring.intro")}
        </p>
        {sources.length > 1 && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">{t("hostrun.bring.from")}</span>
            <select
              value={source.id}
              onChange={(e) =>
                change(() => {
                  const next = sources.find((s) => s.id === e.target.value) ?? source;
                  setFrom(next.id);
                  setWho(next.started ? "out" : "all");
                  setCut(String(next.cut));
                })
              }
              className="field py-1.5"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.label === "Main bracket" ? t("hostrun.bring.mainBracket") : s.label}</option>
              ))}
            </select>
          </label>
        )}
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-semibold">{t("hostrun.bring.whoFrom", { label: source.label === "Main bracket" ? t("hostrun.bring.theMainBracket") : source.label })}</legend>
          <label className={`flex flex-wrap items-center gap-2 ${source.started ? "" : "text-muted"}`}>
            <input type="radio" name="bring-who" checked={who === "out"} disabled={!source.started} onChange={() => change(() => setWho("out"))} />
            {t("hostrun.bring.outPlaced")}
            <input
              type="number"
              min={2}
              max={512}
              value={cut}
              disabled={!source.started || who !== "out"}
              onChange={(e) => change(() => setCut(e.target.value))}
              aria-label={t("hostrun.bring.cutLabel")}
              className="field w-20 py-1"
            />
            {t("hostrun.bring.orLower")}
            {!source.started && <span className="text-meta">{t("hostrun.bring.notStarted")}</span>}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="bring-who" checked={who === "all"} onChange={() => change(() => setWho("all"))} />
            {t("hostrun.bring.everyone")}
          </label>
        </fieldset>
        <button type="button" disabled={pending} onClick={look} className="btn btn-sm btn-outline self-start">
          {pending && !preview && !done ? t("hostrun.looking") : t("hostrun.bring.seeWho")}
        </button>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {note && <p role="status" className="text-sm text-muted">{note}</p>}

        {preview && (
          <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
            {preview.add.length > 0 ? (
              <>
                <p className="text-sm font-semibold">
                  {t("hostrun.bring.toAdd", { n: preview.add.length, from: preview.from, cut: preview.cut !== null ? t("hostrun.bring.cut", { place: t(ordinalKey(preview.cut), { n: preview.cut }) }) : "" })}
                </p>
                <ol className="max-h-48 list-decimal overflow-y-auto rounded-lg bg-surface-2 py-2 pl-9 pr-3 text-sm">
                  {preview.add.map((tag, i) => (
                    <li key={`${tag}-${i}`} className="break-words">{tag}</li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="text-sm font-semibold">{t("hostrun.bring.noOneNew")}</p>
            )}
            <ul className="list-disc pl-5 text-meta text-muted">
              {preview.stillIn > 0 && <li>{t("hostrun.bring.stillIn", { n: preview.stillIn, from: preview.from })}</li>}
              {preview.above > 0 && <li>{t("hostrun.bring.above", { n: preview.above })}</li>}
              {preview.already > 0 && <li>{t("hostrun.bring.already", { n: preview.already })}</li>}
              {preview.leftOut.length > 0 && (
                <li>
                  {t("hostrun.bring.leftOut", { n: preview.leftOut.length, list: preview.leftOut.slice(0, 12).join(", ") })}
                  {preview.leftOut.length > 12 ? "…" : "."} {t("hostrun.bring.leftOutHint")}
                </li>
              )}
              {preview.noRoom > 0 && <li>{t("hostrun.bring.noRoom", { n: preview.noRoom })}</li>}
              {preview.add.length > 0 && <li>{t("hostrun.bring.accountsNote")}</li>}
              {preview.add.length > 0 && preview.checkIn && <li>{t("hostrun.bring.checkInNote")}</li>}
            </ul>
            {preview.add.length > 0 && (
              <div className="flex gap-2">
                <button type="button" disabled={pending} onClick={add} className="btn btn-sm btn-primary">
                  {pending ? t("hostrun.adding") : t("hostrun.addN", { n: preview.add.length })}
                </button>
                <button type="button" disabled={pending} onClick={() => setPreview(null)} className="btn btn-sm btn-outline">
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>
        )}

        {done && (
          <p role="status" className="text-sm">
            <b>{t("hostrun.bring.doneAdded", { n: done.added })}</b> {t("hostrun.bring.doneHint")}{" "}
            <button type="button" disabled={pending} onClick={undo} className="text-muted underline">
              {t("hostrun.undo")}
            </button>
          </p>
        )}
      </div>
    </details>
  );
}
