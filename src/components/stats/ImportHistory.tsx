"use client";
// On your own claimed player page: bring in your whole start.gg history. Each tap saves up to 200
// events and the page keeps going on its own until it's done (or you stop it).
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { importMyHistory } from "@/app/players/actions";
import type { ImportState } from "@/lib/claimedHistory";
import { useT } from "@/lib/i18n/client";

export default function ImportHistory({ initial }: { initial: ImportState | null }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  async function run() {
    setRunning(true);
    setError(null);
    stop.current = false;
    try {
      for (let i = 0; i < 40 && !stop.current; i++) {
        const res = await importMyHistory();
        if (res.state) setState(res.state);
        if (res.error) {
          setError(res.error);
          break;
        }
        if (!res.state || res.state.done) break;
      }
    } catch {
      setError(t("people.import.offline"));
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  if (state?.done && !running) {
    return <p className="text-meta text-muted">{t("people.import.done", { n: state.saved })}</p>;
  }
  const pct = state?.totalPages ? Math.min(100, Math.round(((state.nextPage - 1) / state.totalPages) * 100)) : 0;
  return (
    <div className="card flex flex-col gap-2 p-4">
      <p className="text-sm font-semibold">{t("people.import.ask")}</p>
      <p className="text-meta text-muted">{t("people.import.body")}</p>
      {(running || (state && !state.done)) && state?.totalPages ? (
        <div className="flex items-center gap-3" role="status">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-meta tabular-nums text-muted">{t("people.import.saved", { n: state.saved })}</span>
        </div>
      ) : null}
      <div className="flex gap-2">
        {running ? (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => (stop.current = true)}>
            {t("people.import.pause")}
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-primary" onClick={run}>
            {state && !state.done ? t("people.import.keepGoing") : t("people.import.start")}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
