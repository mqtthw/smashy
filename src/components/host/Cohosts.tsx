"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addCohost, removeCohost } from "@/app/host/actions";
import type { Cohost } from "@/lib/hostedEvents";
import { useT } from "@/lib/i18n/client";

/**
 * Co-TOs: the host adds people (by Smashy handle) who can run the event with them: check people in,
 * add walk-ins, seed, start the bracket, report and fix results. A co-TO sees the list and can step down.
 */
export default function Cohosts({ eventId, cohosts, mainHost, me }: { eventId: string; cohosts: Cohost[]; mainHost: boolean; me: string | null }) {
  const t = useT();
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      setNote(null);
      const res = await fn();
      setNote(res.error ?? ok);
      if (!res.error) after?.();
    });

  return (
    <section className="card flex flex-col gap-2 p-4" aria-labelledby="cohosts">
      <h2 id="cohosts" className="font-bold">{t("hostrun.cohosts.title")}</h2>
      <p className="text-meta text-muted">
        {t("hostrun.cohosts.hint")}
        {mainHost ? t("hostrun.cohosts.onlyYou") : ""}
      </p>
      {cohosts.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {cohosts.map((c) => (
            <li key={c.userId} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <Link href={`/u/${c.handle}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{c.tag}</Link>
              {(mainHost || c.userId === me) && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    window.confirm(c.userId === me ? t("hostrun.cohosts.stepDownConfirm") : t("hostrun.cohosts.removeConfirm", { tag: c.tag })) &&
                    run(() => removeCohost(eventId, c.userId), c.userId === me ? t("hostrun.cohosts.steppedDown") : t("hostrun.cohosts.removed", { tag: c.tag }))
                  }
                  className="btn btn-sm btn-ghost text-danger"
                >
                  {c.userId === me ? t("hostrun.cohosts.stepDown") : t("hostrun.cohosts.remove")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {mainHost && cohosts.length < 5 && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (handle.trim()) run(() => addCohost(eventId, handle), t("hostrun.cohosts.added"), () => setHandle(""));
          }}
        >
          <label htmlFor="cohost-handle" className="sr-only">{t("hostrun.cohosts.handleLabel")}</label>
          <input id="cohost-handle" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={31} placeholder={t("hostrun.cohosts.handlePlaceholder")} className="field min-w-0 flex-1 py-1.5" />
          <button type="submit" disabled={pending || !handle.trim()} className="btn btn-sm btn-primary">{t("hostrun.cohosts.add")}</button>
        </form>
      )}
      {note && <p role="status" className="text-sm text-muted">{note}</p>}
    </section>
  );
}
