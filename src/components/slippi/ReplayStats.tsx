"use client";
// Drop in Slippi replays (files or a whole folder) and see your own numbers across them. Everything is
// read on this device: no replay is uploaded. A signed-in member can save the summary to their profile.
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import NewTab from "@/components/ui/NewTab";
import type { ReadResult, SkipReason } from "@/lib/slippiRead";
import { useT } from "@/lib/i18n/client";
import { likelyMe, totalsFor, type ReplayGame } from "@/lib/slippiStats";
import { SLIPPIPEDIA_MAX_BYTES } from "@/lib/slippipediaRead";
import { toSavedSummary } from "@/lib/replayProfile";
import { SummaryView, TallyList } from "./ReplayParts";
import SaveReplayPanel, { type SavedState } from "./SaveReplayPanel";

const MAX_FILES = 500;
const MAX_BYTES = 30 * 1024 * 1024;

export default function ReplayStats({ signedIn = false, saved = null, handle = null }: { signedIn?: boolean; saved?: SavedState; handle?: string | null }) {
  const [games, setGames] = useState<ReplayGame[]>([]);
  const t = useT();
  const [skipped, setSkipped] = useState<{ file: string; reason: SkipReason }[]>([]);
  const [progress, setProgress] = useState<{ done: number; of: number } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const cancel = useRef(false);
  const [importing, setImporting] = useState(false);

  const people = useMemo(() => likelyMe(games), [games]);
  const me = chosen && people.some((p) => p.key === chosen) ? chosen : (people[0]?.key ?? null);
  const totals = useMemo(() => (me ? totalsFor(games, me) : null), [games, me]);
  const summary = useMemo(() => (totals ? toSavedSummary(totals) : null), [totals]);

  async function read(list: FileList | null) {
    const all = [...(list ?? [])].filter((f) => f.name.toLowerCase().endsWith(".slp"));
    if (!all.length) {
      setNote(t("play.replays.noFiles"));
      return;
    }
    const files = all.slice(0, MAX_FILES);
    setNote(all.length > MAX_FILES ? t("play.replays.firstOf", { max: MAX_FILES, n: all.length }) : null);
    cancel.current = false;
    const found: ReplayGame[] = [];
    const left: { file: string; reason: SkipReason }[] = [];
    const { readReplay } = await import("@/lib/slippiRead");
    for (let i = 0; i < files.length && !cancel.current; i++) {
      setProgress({ done: i, of: files.length });
      const f = files[i];
      let res: ReadResult;
      if (f.size > MAX_BYTES) res = { skipped: "tooBig" };
      else {
        try {
          res = await readReplay(f.name, await f.arrayBuffer());
        } catch {
          res = { skipped: "unreadable" };
        }
      }
      if ("game" in res) found.push(res.game);
      else left.push({ file: f.name, reason: res.skipped });
      await new Promise((r) => setTimeout(r, 0)); // let the page update between replays
    }
    setGames(found);
    setSkipped(left);
    setChosen(null);
    setProgress(null);
  }

  /** A Slippipedia database: every game it analyzed, read on this device (see lib/slippipediaRead.ts). */
  async function readDatabase(file: File | undefined) {
    if (!file) return;
    if (file.size > SLIPPIPEDIA_MAX_BYTES) {
      setNote(t("play.replays.slippipediaBig", { mb: SLIPPIPEDIA_MAX_BYTES / 1024 / 1024 }));
      return;
    }
    setImporting(true);
    setNote(null);
    try {
      const { readSlippipedia } = await import("@/lib/slippipediaRead");
      const res = await readSlippipedia(await file.arrayBuffer());
      if ("error" in res) {
        setNote(t(res.error === "notSlippipedia" ? "play.replays.slippipediaNot" : res.error === "tooBig" ? "play.replays.slippipediaBig" : "play.replays.slippipediaUnreadable", { mb: SLIPPIPEDIA_MAX_BYTES / 1024 / 1024 }));
        return;
      }
      if (!res.total) {
        setNote(t("play.replays.slippipediaEmpty"));
        return;
      }
      setGames(res.games);
      setSkipped(res.skipped);
      setChosen(null);
      setNote(t("play.replays.slippipediaFrom", { n: res.games.length }));
    } catch {
      setNote(t("play.replays.slippipediaUnreadable"));
    } finally {
      setImporting(false);
    }
  }

  const busy = progress !== null || importing;
  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-4">
        <p className="text-body">
          {t("play.replays.pickBefore")} <b>{t("play.replays.folder")}</b>{t("play.replays.pickAfter")}
        </p>
        <div className="flex flex-wrap gap-2">
          <label className={`btn btn-md btn-primary ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
            {t("play.replays.choose")}
            <input type="file" accept=".slp" multiple className="sr-only" disabled={busy} onChange={(e) => read(e.target.files)} />
          </label>
          <label className={`btn btn-md btn-outline ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
            {t("play.replays.chooseFolder")}
            <input
              type="file"
              multiple
              className="sr-only"
              disabled={busy}
              ref={(el) => {
                el?.setAttribute("webkitdirectory", "");
              }}
              onChange={(e) => read(e.target.files)}
            />
          </label>
        </div>
        <p className="text-meta text-muted">{t("play.replays.private")}</p>
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <label className={`btn btn-md btn-outline self-start ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
            {t("play.replays.slippipedia")}
            <input type="file" accept=".sqlite,.db,.sqlite3" className="sr-only" disabled={busy} onChange={(e) => void readDatabase(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
          </label>
          <p className="text-meta text-muted">{t("play.replays.slippipediaHelp")}</p>
          <p className="text-meta text-muted">
            {t("play.replays.slippipediaGet")}{" "}
            <a href="https://github.com/cbartsch/Slippipedia/releases" target="_blank" rel="noopener noreferrer" className="link">
              {t("play.replays.slippipediaLink")}
              <NewTab />
            </a>
            {" · "}
            {t("play.replays.slippipediaVideos")}{" "}
            <Link href="/" className="link">{t("play.replays.slippipediaPost")}</Link>
          </p>
        </div>
        {importing && <p className="text-meta text-muted" role="status">{t("play.replays.slippipediaReading")}</p>}
        {progress && (
          <div className="flex items-center gap-3" role="status">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((progress.done / progress.of) * 100)}%` }} />
            </span>
            <span className="text-meta tabular-nums text-muted">
              {t("play.replays.reading", { done: progress.done + 1, n: progress.of })}
            </span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => (cancel.current = true)}>
              {t("play.replays.stop")}
            </button>
          </div>
        )}
        {note && <p className="text-meta text-muted">{note}</p>}
      </section>

      {!busy && totals && (
        <section aria-labelledby="replay-stats-heading" className="card flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="replay-stats-heading" className="font-bold">
              {t("play.replays.statsOf", { name: totals.me })}
            </h2>
            {people.length > 1 && (
              <label className="flex items-center gap-2 text-meta text-muted">
                {t("play.replays.statsFor")}
                <select value={me ?? ""} onChange={(e) => setChosen(e.target.value)} className="field py-1">
                  {people.slice(0, 50).map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.key} ({p.games})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <SummaryView s={summary!}>
            <TallyList title={t("play.replays.mostPlayed")} rows={totals.opponents} />
          </SummaryView>
          <p className="text-meta text-muted">
            {t("play.replays.how")}
          </p>
        </section>
      )}

      {!busy && (summary || saved) && <SaveReplayPanel summary={summary} signedIn={signedIn} saved={saved} handle={handle} />}

      {!busy && skipped.length > 0 && (
        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">
            {t("play.replays.leftOut", { n: skipped.length })}
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-meta text-muted">
            {skipped.slice(0, 100).map((s, i) => (
              <li key={`${i}-${s.file}`} className="truncate">
                {s.file}: {t(`play.replays.skip.${s.reason}`)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {!busy && !totals && games.length === 0 && skipped.length > 0 && <p className="text-muted">{t("play.replays.noneKept")}</p>}
    </div>
  );
}
