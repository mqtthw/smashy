"use client";

import { useState, useTransition } from "react";
import { importStartggPlayers, previewStartggImport, undoStartggImport, type StartggImportChoices, type StartggImportPreview } from "@/app/host/actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

/**
 * Host tool: bring an event's players over from start.gg. Paste the link, look at who would be
 * added, then add them. They come over as names only (like walk-ins), in start.gg's seeding order.
 * Lives outside the host panel so its "Undo" survives the page refreshing after the add.
 */
export default function StartggImport({ eventId }: { eventId: string }) {
  const t = useT();
  const [link, setLink] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<StartggImportChoices | null>(null);
  const [preview, setPreview] = useState<StartggImportPreview | null>(null);
  const [done, setDone] = useState<{ added: number; ids: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // `fromList` = one of the tournament's events was picked: the list stays, so picking the wrong
  // one (say the doubles event) or pressing Cancel leaves the others a tap away.
  const look = (target: string, fromList = false) =>
    start(async () => {
      setError(null);
      setNote(null);
      if (!fromList) setChoices(null);
      setPreview(null);
      try {
        const res = await previewStartggImport(eventId, target);
        if (res.choices) setChoices(res.choices);
        if (res.preview) setPreview(res.preview);
        setError(res.error ?? null);
      } catch {
        setError(t("common.offline"));
      }
    });

  const add = () => {
    if (!preview) return;
    const slug = preview.slug;
    start(async () => {
      setError(null);
      try {
        setDone(null); // an earlier import can't be undone from here anymore
        const res = await importStartggPlayers(eventId, slug);
        if (res.error || !res.ids) {
          setError(res.error ?? t("hostrun.addPlayersFailed"));
          return;
        }
        setDone({ added: res.added ?? res.ids.length, ids: res.ids });
        setPreview(null);
        setChoices(null);
        setLink("");
      } catch {
        setError(t("common.offline"));
      }
    });
  };

  const undo = () => {
    if (!done) return;
    const { ids, added } = done;
    start(async () => {
      setError(null);
      try {
        const res = await undoStartggImport(eventId, ids);
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

  return (
    <details className="card p-4" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-bold">{t("hostrun.startgg.title")}</summary>
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-sm text-muted">
          {t("hostrun.startgg.intro")}
        </p>
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (link.trim()) look(link.trim());
          }}
        >
          <label htmlFor="startgg-import-link" className="text-sm font-semibold">{t("hostrun.startgg.linkLabel")}</label>
          <div className="flex gap-2">
            <input
              id="startgg-import-link"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={500}
              placeholder="https://www.start.gg/tournament/…/event/…"
              className="field min-w-0 flex-1 py-1.5"
            />
            <button type="submit" disabled={pending || !link.trim()} className="btn btn-sm btn-outline">
              {pending && !preview && !done ? t("hostrun.looking") : t("hostrun.startgg.lookUp")}
            </button>
          </div>
        </form>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {note && <p role="status" className="text-sm text-muted">{note}</p>}

        {choices && !preview && (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <b>{choices.tournamentName}</b> {t("hostrun.startgg.hasEvents", { n: choices.events.length })}
            </p>
            <ul className="flex flex-col gap-1.5">
              {choices.events.map((e) => (
                <li key={e.slug}>
                  <button type="button" disabled={pending} onClick={() => look(`https://www.start.gg/${e.slug}`, true)} className="btn btn-sm btn-outline w-full justify-between gap-2 text-left">
                    <span className="min-w-0 truncate">{e.name}</span>
                    <span className="shrink-0 text-meta text-muted">{t("hostrun.nPlayers", { n: e.players })}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <p className="text-sm">
              <b>{preview.eventName}</b>
              {preview.tournamentName ? <span className="text-muted"> · {preview.tournamentName}</span> : null}
              <br />
              {t("hostrun.startgg.onStartgg", { n: preview.found })}
            </p>
            {preview.add.length > 0 ? (
              <>
                <p className="text-sm font-semibold">{t("hostrun.startgg.toAdd", { n: preview.add.length })}</p>
                <ol className="max-h-48 list-decimal overflow-y-auto rounded-lg bg-surface-2 py-2 pl-9 pr-3 text-sm">
                  {preview.add.map((tag) => (
                    <li key={tag} className="break-words">{tag}</li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="text-sm font-semibold">{t("hostrun.startgg.noOneNew")}</p>
            )}
            {preview.already.length > 0 && (
              <p className="text-meta text-muted">
                {t("hostrun.startgg.already", { n: preview.already.length, list: preview.already.slice(0, 12).join(", ") })}
                {preview.already.length > 12 ? "…" : ""}
              </p>
            )}
            {preview.noRoom.length > 0 && (
              <p className="text-meta text-muted">
                {t("hostrun.startgg.noRoom", { cap: preview.cap, n: preview.noRoom.length, list: preview.noRoom.slice(0, 12).join(", ") })}
                {preview.noRoom.length > 12 ? "…" : "."} {t("hostrun.startgg.raiseCap")}
              </p>
            )}
            {preview.blocked > 0 && (
              <p className="text-meta text-muted">
                {t("hostrun.startgg.blocked", { n: preview.blocked })}
              </p>
            )}
            {preview.add.length > 0 && (
              <ul className="list-disc pl-5 text-meta text-muted">
                <li>{t("hostrun.startgg.namesOnly")}</li>
                {preview.checkIn && <li>{t("hostrun.startgg.notCheckedIn")}</li>}
                <li>{t("hostrun.startgg.duplicate")}</li>
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {preview.add.length > 0 && (
                <button type="button" disabled={pending} onClick={add} className="btn btn-sm btn-primary">
                  {pending ? t("hostrun.adding") : t("hostrun.addN", { n: preview.add.length })}
                </button>
              )}
              <button type="button" disabled={pending} onClick={() => setPreview(null)} className="btn btn-sm btn-ghost">{t("common.cancel")}</button>
            </div>
          </div>
        )}

        {done && (
          <p role="status" className="flex flex-wrap items-center gap-2 text-sm">
            <span><Icon name="check" /> {t("hostrun.startgg.done", { n: done.added })}</span>
            <button type="button" disabled={pending} onClick={undo} className="btn btn-sm btn-ghost px-2 text-meta">{t("hostrun.undo")}</button>
          </p>
        )}
      </div>
    </details>
  );
}
