"use client";
// The organizer's setup (league step L2): seeds, divisions (with a suggested split by seed), and
// starting the league, which closes sign-ups and builds every week's pairings.
import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import { suggestDivisions, suggestedDivisionCount } from "@/lib/leagueSchedule";
import { saveLeagueSetup, startLeague, type SetupRow } from "../../actions";

type Row = SetupRow & { tag: string };

export default function Setup({ id, players }: { id: string; players: Row[] }) {
  const t = useT();
  // The list keeps its order while you type (it re-sorted on every key, so rows jumped away from the
  // cursor); it's sorted by division and seed when the page opens and after "Suggest".
  const byDivision = (a: Row, b: Row) => (a.division ?? 99) - (b.division ?? 99) || (a.seed ?? 999) - (b.seed ?? 999);
  const [rows, setRows] = useState<Row[]>(() => [...players].sort(byDivision));
  const [count, setCount] = useState(() => suggestedDivisionCount(players.length));
  const [note, setNote] = useState<{ error?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (userId: string, patch: Partial<Row>) => setRows((cur) => cur.map((r) => (r.userId === userId ? { ...r, ...patch } : r)));
  const suggest = () => {
    const split = suggestDivisions(rows, count);
    const division = new Map(split.flatMap((d, i) => d.map((r) => [r.userId, i + 1] as const)));
    setRows((cur) => cur.map((r) => ({ ...r, division: division.get(r.userId) ?? null })).sort(byDivision));
  };
  const payload = () => rows.map(({ userId, seed, division }) => ({ userId, seed, division }));
  const save = () =>
    start(async () => {
      const res = await saveLeagueSetup(id, payload());
      setNote(res.error ? { error: true, text: res.error } : { text: t("league.manage.saved") });
    });
  const begin = () => {
    if (!confirm(t("league.manage.startConfirm"))) return;
    start(async () => {
      const saved = await saveLeagueSetup(id, payload());
      if (saved.error) return setNote({ error: true, text: saved.error });
      const res = await startLeague(id); // goes to the league page when it works
      if (res?.error) setNote({ error: true, text: res.error });
    });
  };
  const divisions = Math.max(count, ...rows.map((r) => r.division ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-2 p-4">
        <h2 className="font-bold">{t("league.manage.divisions")}</h2>
        <p className="text-meta text-muted">{t("league.manage.divisionsHint")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            {t("league.manage.count")}
            <input type="number" min={1} max={32} value={count} onChange={(e) => setCount(Math.max(1, Math.min(32, Number(e.target.value) || 1)))} className="field w-20" />
          </label>
          <button type="button" onClick={suggest} disabled={!rows.length} className="btn btn-sm btn-outline">{t("league.manage.suggest")}</button>
        </div>
      </section>

      {rows.length ? (
        <ul className="card divide-y divide-line">
          {rows.map((r) => (
            <li key={r.userId} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">{r.tag}</span>
              <label className="flex items-center gap-1 text-meta text-muted">
                {t("league.manage.seed")}
                <input type="number" min={1} max={256} value={r.seed ?? ""} onChange={(e) => set(r.userId, { seed: e.target.value ? Number(e.target.value) : null })} className="field w-16 py-1" aria-label={t("league.manage.seedFor", { tag: r.tag })} />
              </label>
              <select value={r.division ?? ""} onChange={(e) => set(r.userId, { division: e.target.value ? Number(e.target.value) : null })} className="field w-auto py-1" aria-label={t("league.manage.divisionFor", { tag: r.tag })}>
                <option value="">{t("league.manage.noDivision")}</option>
                {Array.from({ length: divisions }, (_, i) => <option key={i + 1} value={i + 1}>{t("league.division", { n: i + 1 })}</option>)}
              </select>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-4 text-sm text-muted">{t("league.noPlayers")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={pending} className="btn btn-md btn-outline">{t("league.manage.save")}</button>
        <button type="button" onClick={begin} disabled={pending || rows.length < 2} className="btn btn-md btn-primary">{t("league.manage.start")}</button>
      </div>
      <p className="text-meta text-muted">{t("league.manage.startHint")}</p>
      {note && <p role={note.error ? "alert" : "status"} className={`text-sm ${note.error ? "text-danger" : "text-success"}`}>{note.text}</p>}
    </div>
  );
}
