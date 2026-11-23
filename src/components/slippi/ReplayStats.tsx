"use client";
// Drop in Slippi replays (files or a whole folder) and see your own numbers across them. Everything is
// read on this device: no replay is uploaded. A signed-in member can save the summary to their profile.
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import NewTab from "@/components/ui/NewTab";
import type { ReadResult, SkipReason } from "@/lib/slippiRead";
import { useT } from "@/lib/i18n/client";
import { bestCombos, likelyMe, totalsFor, type ReplayGame } from "@/lib/slippiStats";
import { SLIPPIPEDIA_MAX_BYTES } from "@/lib/slippipediaRead";
import { toSavedSummary } from "@/lib/replayProfile";
import { REPLAY_BATCH, newestReplays, replaysInFolder, takeBatch, type DirHandle } from "@/lib/replayPick";
import { SummaryView, TallyList } from "./ReplayParts";
import BestCombos from "./BestCombos";
import SaveReplayPanel, { type SavedState } from "./SaveReplayPanel";

const MAX_BYTES = 30 * 1024 * 1024;

export default function ReplayStats({ signedIn = false, saved = null, handle = null }: { signedIn?: boolean; saved?: SavedState; handle?: string | null }) {
  const [games, setGames] = useState<ReplayGame[]>([]);
  const t = useT();
  const [skipped, setSkipped] = useState<{ file: string; reason: SkipReason }[]>([]);
  const [progress, setProgress] = useState<{ done: number; of: number } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const cancel = useRef(false);
  const folderInput = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  // Replays picked but not read yet (newest first), and how many were picked in all (round 762).
  const [queue, setQueue] = useState<File[]>([]);
  const [picked, setPicked] = useState(0);

  const people = useMemo(() => likelyMe(games), [games]);
  const me = chosen && people.some((p) => p.key === chosen) ? chosen : (people[0]?.key ?? null);
  const totals = useMemo(() => (me ? totalsFor(games, me) : null), [games, me]);
  const summary = useMemo(() => (totals ? toSavedSummary(totals) : null), [totals]);
  // Combos come from replay files only (a Slippipedia database has none).
  const combos = useMemo(() => (me && games.some((g) => g.combos) ? bestCombos(games, me) : null), [games, me]);

  /** A fresh pick: the newest replays first, one batch now and the rest on "read more". */
  async function read(list: FileList | File[] | null) {
    const all = newestReplays([...(list ?? [])]);
    if (!all.length) {
      setNote(t("play.replays.noFiles"));
      return;
    }
    setPicked(all.length);
    setNote(null);
    await readBatch(all, [], []);
  }

  /** The folder button: the browser's folder picker where it has one (its prompt says "view files", not "upload"). */
  async function pickFolder(fallback: HTMLInputElement | null) {
    const picker = (window as unknown as { showDirectoryPicker?: (o?: { mode?: "read" }) => Promise<DirHandle> }).showDirectoryPicker;
    if (!picker) {
      fallback?.click();
      return;
    }
    let dir: DirHandle;
    try {
      dir = await picker({ mode: "read" });
    } catch {
      return; // closed without picking
    }
    setImporting(true);
    try {
      await read(await replaysInFolder(dir));
    } catch {
      setNote(t("play.replays.noFiles"));
    } finally {
      setImporting(false);
    }
  }

  /** Reads the next batch of `from` and adds it to what's been read so far. */
  async function readBatch(from: File[], soFar: ReplayGame[], skippedSoFar: { file: string; reason: SkipReason }[]) {
    const { batch: files, rest } = takeBatch(from);
    cancel.current = false;
    const found: ReplayGame[] = [...soFar];
    const left: { file: string; reason: SkipReason }[] = [...skippedSoFar];
    const { readReplay } = await import("@/lib/slippiRead");
    let i = 0;
    for (; i < files.length && !cancel.current; i++) {
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
    if (!soFar.length) setChosen(null);
    setQueue([...files.slice(i), ...rest]); // after "Stop", the unread ones wait for "read more"
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
      setQueue([]);
      setPicked(0);
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
          <button type="button" className="btn btn-md btn-outline" disabled={busy} onClick={() => void pickFolder(folderInput.current)}>
            {t("play.replays.chooseFolder")}
          </button>
          {/* For browsers without the folder picker (Firefox, Safari): the older way, opened by the button above. */}
          <input
            type="file"
            multiple
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            disabled={busy}
            ref={(el) => {
              el?.setAttribute("webkitdirectory", "");
              folderInput.current = el;
            }}
            onChange={(e) => read(e.target.files)}
          />
        </div>
        <p className="text-meta text-muted">{t("play.replays.private")} {t("play.replays.browserAsks")}</p>
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
        {!busy && (picked > REPLAY_BATCH || queue.length > 0) && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-meta text-muted">{t("play.replays.newestFirst", { n: picked, done: picked - queue.length })}</p>
            {queue.length > 0 && (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => void readBatch(queue, games, skipped)}>
                {t("play.replays.readMore", { n: Math.min(REPLAY_BATCH, queue.length), left: queue.length })}
              </button>
            )}
          </div>
        )}
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

      {!busy && totals && combos && <BestCombos combos={combos} />}

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
