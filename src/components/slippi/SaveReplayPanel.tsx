"use client";
// "Save to your profile" under the replay stats: keeps the summary (not the replays, the connect code or
// opponents' names) and lets the member choose whether it shows on their profile, or remove it.
import Link from "next/link";
import { useState, useTransition } from "react";
import { removeReplayStats, saveReplayStats, setReplayStatsShown } from "@/app/replays/actions";
import { useT } from "@/lib/i18n/client";
import type { SavedReplaySummary } from "@/lib/replayProfile";

export type SavedState = { games: number; shown: boolean } | null;

export default function SaveReplayPanel({ summary, signedIn, saved: initial, handle }: { summary: SavedReplaySummary | null; signedIn: boolean; saved: SavedState; handle: string | null }) {
  const t = useT();
  const [saved, setSaved] = useState<SavedState>(initial);
  const [show, setShow] = useState(initial?.shown ?? false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return summary ? (
      <p className="text-sm text-muted">
        <Link href="/signin?next=/replays" className="link">{t("play.replays.save.signIn")}</Link>
      </p>
    ) : null;
  }

  const run = (work: () => Promise<{ ok?: boolean; error?: string }>, done: () => void, okNote: string) =>
    start(async () => {
      const res: { ok?: boolean; error?: string } = await work().catch(() => ({ error: "save" }));
      if (res.ok) {
        done();
        setNote(okNote);
      } else setNote(t("play.replays.save.err"));
    });

  return (
    <section aria-labelledby="save-replays" className="card flex flex-col gap-3 p-4">
      <h2 id="save-replays" className="font-bold">{t("play.replays.save.title")}</h2>
      {saved && (
        <p className="text-sm">
          {t("play.replays.save.current", { n: saved.games })}{" "}
          <span className="text-muted">{saved.shown ? t("play.replays.save.shownNow") : t("play.replays.save.hiddenNow")}</span>
          {handle && (
            <>
              {" "}
              <Link href={`/u/${handle}?tab=stats`} className="link">{t("play.replays.save.view")}</Link>
            </>
          )}
        </p>
      )}
      <p className="text-meta text-muted">{t("play.replays.save.help")}</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={show}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setShow(next);
            if (saved) run(() => setReplayStatsShown(next), () => setSaved({ ...saved, shown: next }), t("play.replays.save.saved"));
          }}
        />
        <span>{t("play.replays.save.show")}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {summary && (
          <button
            type="button"
            disabled={pending}
            className="btn btn-md btn-primary"
            onClick={() => run(() => saveReplayStats(summary, show), () => setSaved({ games: summary.games, shown: show }), t("play.replays.save.saved"))}
          >
            {saved ? t("play.replays.save.update") : t("play.replays.save.button")}
          </button>
        )}
        {saved && (
          <button type="button" disabled={pending} className="btn btn-md btn-outline" onClick={() => run(removeReplayStats, () => setSaved(null), t("play.replays.save.removed"))}>
            {t("play.replays.save.remove")}
          </button>
        )}
      </div>
      {note && <p role="status" className="text-sm">{note}</p>}
    </section>
  );
}
