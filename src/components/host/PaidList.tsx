"use client";

import { useState, useTransition } from "react";
import { setEntryPaid } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

/**
 * The TO's own checklist of who has paid the venue or entry fee. Only the people running the event
 * ever see it, and Smashy doesn't take payments: it's a tick per player (or team), nothing more.
 */
export default function PaidList({ eventId, entries, paid, teams = false }: { eventId: string; entries: { id: string; tag: string }[]; paid: string[]; teams?: boolean }) {
  const t = useT();
  const [marked, setMarked] = useState(() => new Set(paid));
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const set = (id: string, on: boolean) =>
    setMarked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggle = (id: string) => {
    const on = !marked.has(id);
    set(id, on); // shown at once; put back if saving fails
    setError(null);
    start(async () => {
      try {
        const res = await setEntryPaid(eventId, id, on);
        if (res.error) {
          set(id, !on);
          setError(res.error);
        }
      } catch {
        set(id, !on);
        setError(t("common.offline"));
      }
    });
  };
  const count = entries.filter((e) => marked.has(e.id)).length;
  const owing = entries.filter((e) => !marked.has(e.id));
  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-bold">
        {t("hostrun.paid.title", { count, total: entries.length })}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-meta text-muted">
          {teams ? t("hostrun.paid.hintTeams") : t("hostrun.paid.hintPlayers")}
        </p>
        <ul className="divide-y divide-line">
          {entries.map((e) => (
            <li key={e.id}>
              <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
                <input type="checkbox" checked={marked.has(e.id)} onChange={() => toggle(e.id)} className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate">{e.tag}</span>
                {marked.has(e.id) && <span className="text-meta text-muted">{t("hostrun.paid.paid")}</span>}
              </label>
            </li>
          ))}
        </ul>
        {count > 0 && owing.length > 0 && (
          <p className="text-meta text-muted">
            {t("hostrun.paid.notYet", { n: owing.length, list: owing.slice(0, 20).map((e) => e.tag).join(", ") })}
            {owing.length > 20 ? "…" : ""}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </details>
  );
}
