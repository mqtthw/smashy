"use client";

import { useState, useTransition } from "react";
import { copyBracketToChallonge, setPrName } from "@/app/host/actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import type { PrRow } from "@/lib/prNames";
import NewTab from "@/components/ui/NewTab";

/**
 * A finished bracket on Challonge, for ranking sites that only import start.gg or Challonge links
 * (like Braacket, used by San Antonio Melee's PR). Hosts and co-TOs copy it once; everyone sees the link.
 */
/** One player's name on the scene's PR: saved when the box loses focus (empty = use their tag). */
function PrNameRow({ eventId, row }: { eventId: string; row: PrRow }) {
  const t = useT();
  const [saved, setSaved] = useState(row.prName ?? "");
  const [value, setValue] = useState(row.prName ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async () => {
    if (value.trim() === saved.trim()) return;
    setState("saving");
    const res = await setPrName(eventId, row.id, value).catch(() => ({ error: "x" }));
    if (res.error) setState("error");
    else {
      setSaved(value.trim());
      setState("saved");
    }
  };
  return (
    <li className="flex items-center gap-2 text-sm">
      <label htmlFor={`pr-${row.id}`} className="w-28 shrink-0 truncate">{row.tag}</label>
      <input
        id={`pr-${row.id}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setState("idle");
        }}
        onBlur={save}
        maxLength={60}
        placeholder={row.tag}
        className="field min-w-0 flex-1 py-1"
      />
      <span className="w-14 shrink-0 text-meta text-muted" aria-live="polite">
        {state === "saving" ? t("common.saving") : state === "saved" ? t("hostbracket.pr.saved") : state === "error" ? <span className="text-danger">{t("hostbracket.pr.error")}</span> : null}
      </span>
    </li>
  );
}

export default function ChallongeCopy({ eventId, url, canCopy, prRows = [] }: { eventId: string; url: string | null; canCopy: boolean; prRows?: PrRow[] }) {
  const t = useT();
  const [link, setLink] = useState(url);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (link) {
    return (
      <p className="text-sm text-muted">
        <Icon name="chart" /> {t("hostbracket.challonge.on")}{" "}
        <a href={link} target="_blank" rel="noopener noreferrer" className="link break-all">{link.replace("https://", "")}<NewTab /></a>
        {canCopy && <span className="block text-meta">{t("hostbracket.challonge.braacket")}</span>}
      </p>
    );
  }
  if (!canCopy) return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await copyBracketToChallonge(eventId);
            if (res.url) setLink(res.url);
            else setError(res.error ?? t("hostbracket.challonge.failed"));
          })
        }
        className="btn btn-sm btn-outline self-start"
      >
        {pending ? (
          t("hostbracket.challonge.copying")
        ) : (
          <>
            <Icon name="chart" /> {t("hostbracket.challonge.copy")}
          </>
        )}
      </button>
      <p className="text-meta text-muted">{t("hostbracket.challonge.hint")}</p>
      {prRows.length > 0 && (
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            {t("hostbracket.pr.title")} <span className="font-normal text-muted">{t("hostbracket.pr.set", { n: prRows.filter((r) => r.prName).length, total: prRows.length })}</span>
          </summary>
          <p className="mt-2 text-meta text-muted">{t("hostbracket.pr.help")}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {prRows.map((r) => (
              <PrNameRow key={r.id} eventId={eventId} row={r} />
            ))}
          </ul>
        </details>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
