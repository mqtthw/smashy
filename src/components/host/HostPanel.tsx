"use client";

import { placeKey as ordinalKey } from "@/lib/i18n/base";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addWalkIn, addWalkInTeam, hostCheckIn, removeEntrant, setHostedStatus, setSeeds } from "@/app/host/actions";
import { seedByPlacement, seedByRecord } from "@/lib/hostedRecord";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

type Entrant = { userId: string; tag: string; checkedIn: boolean };

// Which ending a place takes in English ("1st", "12th"); each language fills in its own.

/** The host's tools: sign-ups open/closed, edit, cancel, and seeding (move people up and down). */
export default function HostPanel({
  eventId,
  status,
  entrants,
  editable,
  checkIn = false,
  records = {},
  lastEdition,
  mainHost = true,
  bracket = false,
  extraBrackets = 0,
  doubles = false,
}: {
  eventId: string;
  status: string;
  entrants: Entrant[];
  editable: boolean;
  checkIn?: boolean;
  records?: Record<string, { setWins: number; setLosses: number }>;
  /** The series' last finished edition and how today's entrants placed in it (by their id here). */
  lastEdition?: { name: string; places: Record<string, number> };
  mainHost?: boolean; // co-TOs run the event but don't edit, close sign-ups or cancel it
  bracket?: boolean; // an extra bracket of another event: canceling it leaves the rest of the event alone
  extraBrackets?: number; // a main event's extra brackets that would be canceled with it
  doubles?: boolean; // the entries are teams of two: the host adds a team by typing two names
}) {
  const t = useT();
  const ordinal = (n: number) => t(ordinalKey(n), { n });
  const [order, setOrder] = useState(entrants);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState("");
  const [walkIn2, setWalkIn2] = useState("");
  const run = (fn: () => Promise<{ error?: string }>, ok?: string) =>
    start(async () => {
      setNote(null);
      const res = await fn();
      setNote(res.error ?? ok ?? null);
      if (!res.error) setDirty(false);
    });
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    setDirty(true);
  };
  const hasRecords = Object.values(records).some((r) => r.setWins + r.setLosses > 0);
  const byRecord = () => {
    setOrder(seedByRecord(order, records));
    setDirty(true);
  };
  const byLastEdition = () => {
    if (!lastEdition) return;
    setOrder(seedByPlacement(order, lastEdition.places));
    setDirty(true);
    setNote(t("hostrun.panel.orderedBy", { name: lastEdition.name }));
  };
  const shuffle = () => {
    const next = [...order];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setDirty(true);
  };

  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="host-tools">
      <h2 id="host-tools" className="font-bold">{t("hostrun.panel.title")}</h2>
      {editable && !mainHost ? null : editable ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/host/${eventId}/edit`} className="btn btn-sm btn-outline">{t("hostrun.panel.edit")}</Link>
          {status === "open" ? (
            <button type="button" disabled={pending} onClick={() => run(() => setHostedStatus(eventId, "closed"), t("hostrun.panel.closed"))} className="btn btn-sm btn-outline">{t("hostrun.panel.closeSignups")}</button>
          ) : (
            <button type="button" disabled={pending} onClick={() => run(() => setHostedStatus(eventId, "open"), t("hostrun.panel.reopened"))} className="btn btn-sm btn-outline">{t("hostrun.panel.reopenSignups")}</button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              window.confirm(
                bracket
                  ? t("hostrun.panel.cancelBracketConfirm")
                  : extraBrackets > 0
                    ? t("hostrun.panel.cancelEventExtrasConfirm", { n: extraBrackets })
                    : t("hostrun.panel.cancelEventConfirm"),
              ) && run(() => setHostedStatus(eventId, "canceled"), bracket ? t("hostrun.panel.bracketCanceled") : t("hostrun.panel.eventCanceled"))
            }
            className="btn btn-sm btn-ghost text-danger"
          >
            {bracket ? t("hostrun.panel.cancelBracket") : t("hostrun.panel.cancelEvent")}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">{status === "canceled" ? t("hostrun.panel.isCanceled") : t("hostrun.panel.pastSignups")}</p>
      )}

      {editable && (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(ev) => {
            ev.preventDefault();
            const tag = walkIn.trim();
            const partner = walkIn2.trim();
            if (!tag || (doubles && !partner)) return;
            run(async () => {
              const res = doubles ? await addWalkInTeam(eventId, tag, partner) : await addWalkIn(eventId, tag);
              if (!res.error) {
                setWalkIn("");
                setWalkIn2("");
              }
              return res;
            }, doubles ? t("hostrun.panel.teamAdded", { a: tag, b: partner }) : t("hostrun.panel.added", { tag }));
          }}
        >
          <label htmlFor="walk-in" className="text-sm font-semibold">
            {doubles ? t("hostrun.panel.addTeam") : t("hostrun.panel.addWalkIn")}{" "}
            <span className="font-normal text-muted">
              {doubles ? t("hostrun.panel.addTeamHint") : t("hostrun.panel.addWalkInHint")}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <input id="walk-in" value={walkIn} onChange={(e) => setWalkIn(e.target.value)} maxLength={30} placeholder={doubles ? t("hostrun.panel.firstTag") : t("hostrun.panel.theirTag")} className="field min-w-0 flex-1 py-1.5" />
            {doubles && (
              <input aria-label={t("hostrun.panel.secondTag")} value={walkIn2} onChange={(e) => setWalkIn2(e.target.value)} maxLength={30} placeholder={t("hostrun.panel.secondTag")} className="field min-w-0 flex-1 py-1.5" />
            )}
            <button type="submit" disabled={pending || !walkIn.trim() || (doubles && !walkIn2.trim())} className="btn btn-sm btn-primary">{t("hostrun.panel.add")}</button>
          </div>
        </form>
      )}

      {editable && order.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("hostrun.panel.seeding")} <span className="font-normal text-muted">{t("hostrun.panel.seedingHint")}</span></h3>
            <div className="flex flex-wrap justify-end gap-2">
              {lastEdition && (
                <button type="button" onClick={byLastEdition} className="btn btn-sm btn-ghost" title={t("hostrun.panel.lastResultsTitle", { name: lastEdition.name })}>
                  {t("hostrun.panel.lastResults")}
                </button>
              )}
              {hasRecords && (
                <button type="button" onClick={byRecord} className="btn btn-sm btn-ghost" title={t("hostrun.panel.byRecordTitle")}><Icon name="chart" /> {t("hostrun.panel.byRecord")}</button>
              )}
              <button type="button" onClick={shuffle} className="btn btn-sm btn-ghost">{t("hostrun.panel.shuffle")}</button>
              <button type="button" disabled={!dirty || pending} onClick={() => run(() => setSeeds(eventId, order.map((e) => e.userId)), t("hostrun.panel.seedingSaved"))} className="btn btn-sm btn-primary">
                {t("hostrun.panel.saveSeeding")}
              </button>
            </div>
          </div>
          <ol className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {order.map((e, i) => (
              <li key={e.userId} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="w-6 text-right font-mono tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{e.tag}{e.checkedIn && <span className="ml-1 text-meta text-muted">{t("hostrun.panel.in")}</span>}</span>
                {lastEdition?.places[e.userId] && (
                  <span className="shrink-0 text-meta text-muted" title={t("hostrun.panel.placedAt", { place: ordinal(lastEdition.places[e.userId]), name: lastEdition.name })}>{ordinal(lastEdition.places[e.userId])}</span>
                )}
                {records[e.userId] && records[e.userId].setWins + records[e.userId].setLosses > 0 && (
                  <span className="shrink-0 font-mono text-meta tabular-nums text-muted" title={t("hostrun.panel.recordTitle")}>{records[e.userId].setWins}–{records[e.userId].setLosses}</span>
                )}
                {checkIn && !e.checkedIn && (
                  <button type="button" disabled={pending} onClick={() => run(() => hostCheckIn(eventId, e.userId), t("hostrun.panel.checkedIn", { tag: e.tag }))} className="btn btn-sm btn-ghost px-2 text-meta">
                    {t("hostrun.panel.checkIn")}
                  </button>
                )}
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn btn-sm btn-ghost px-2" aria-label={t("hostrun.panel.moveUp", { tag: e.tag })}>↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} className="btn btn-sm btn-ghost px-2" aria-label={t("hostrun.panel.moveDown", { tag: e.tag })}>↓</button>
                <button
                  type="button"
                  onClick={() => window.confirm(t("hostrun.panel.removeConfirm", { tag: e.tag })) && run(async () => {
                    const res = await removeEntrant(eventId, e.userId);
                    if (!res.error) setOrder((o) => o.filter((x) => x.userId !== e.userId));
                    return res;
                  }, t("hostrun.panel.removed", { tag: e.tag }))}
                  className="btn btn-sm btn-ghost px-2 text-danger"
                  aria-label={t("hostrun.panel.remove", { tag: e.tag })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {note && <p role="status" className="text-sm text-muted">{note}</p>}
    </section>
  );
}
