"use client";
// "Find a match": join the queue with your netplay code, then wait here. While waiting the page asks
// again every few seconds (which also pairs you with anyone who joined meanwhile) and opens the match
// as soon as there is one. The code is remembered on this device for next time.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { findMatch, leaveQueue } from "@/app/ladder/actions";
import { CONNECT_HINT, QUEUE_MINUTES, type LadderGame } from "@/lib/ladder";
import { useT } from "@/lib/i18n/client";

const POLL_MS = 8000;
const storeKey = (game: string) => `ladder-code-${game}`;

export default function FindMatch({ game, queuedCode, others }: { game: LadderGame; queuedCode: string | null; others: number }) {
  const router = useRouter();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const code = useRef(queuedCode ?? "");
  const [waiting, setWaiting] = useState(queuedCode !== null);
  const [since, setSince] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const busy = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey(game));
      if (saved && input.current && !input.current.value) input.current.value = saved;
    } catch {}
  }, [game]);

  async function ask(): Promise<void> {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await findMatch(game, code.current);
      if (res.error) {
        setError(res.error);
        setWaiting(false);
      } else if (res.matchId) {
        router.push(`/ladder/match/${res.matchId}`);
      } else {
        setWaiting(true);
        setSince((s) => s ?? Date.now());
      }
    } catch {
      setError(t("common.offline"));
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      if (since && Date.now() - since > QUEUE_MINUTES * 60_000) {
        setWaiting(false);
        setError(t("play.ladder.timedOut"));
        start(async () => void (await leaveQueue()));
        return;
      }
      void ask();
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, since]);

  if (waiting) {
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="font-semibold">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden />
          {t("play.ladder.lookingNow")}
        </p>
        <p className="text-meta text-muted">{t("play.ladder.keepOpen")}</p>
        <button
          type="button"
          disabled={pending}
          className="btn btn-sm btn-outline self-start"
          onClick={() =>
            start(async () => {
              await leaveQueue();
              setWaiting(false);
              setSince(null);
            })
          }
        >
          {t("play.ladder.stop")}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        code.current = input.current?.value.trim() ?? "";
        try {
          localStorage.setItem(storeKey(game), code.current);
        } catch {}
        start(ask);
      }}
    >
      <label htmlFor="ladder-code" className="text-sm font-semibold">{t("play.ladder.yourCode")}</label>
      <div className="flex flex-wrap gap-2">
        <input
          id="ladder-code"
          ref={input}
          minLength={2}
          maxLength={40}
          required
          placeholder={CONNECT_HINT[game]}
          className="field min-w-0 flex-1 py-1.5"
        />
        <button type="submit" disabled={pending} className="btn btn-md btn-primary">
          {pending ? t("play.ladder.looking") : t("play.ladder.find")}
        </button>
      </div>
      <p className="text-meta text-muted">
        {t("play.ladder.onlyOpp")}{" "}
        {others > 0 ? t("play.ladder.othersLooking", { n: others }) : t("play.ladder.nobodyLooking")}
      </p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
