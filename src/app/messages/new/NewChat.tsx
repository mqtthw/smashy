"use client";

import { useEffect, useState, useTransition } from "react";
import { createGroup, searchPeople, startDirect } from "../actions";
import { useT } from "@/lib/i18n/client";

type Person = { id: string; tag: string; handle: string; mutual: boolean };

/** Pick one person for a direct chat, or two or more (people you follow each other with) for a group. */
export default function NewChat({ mutuals }: { mutuals: Person[] }) {
  const [q, setQ] = useState("");
  const tr = useT();
  const [results, setResults] = useState<Person[]>(mutuals);
  const [picked, setPicked] = useState<Person[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Search as you type (people in your age group; mutuals first).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let stale = false;
    const t = setTimeout(async () => {
      const found = await searchPeople(term);
      if (!stale) setResults(found);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q]);
  const shown = q.trim().length >= 2 ? results : mutuals;

  const toggle = (p: Person) => setPicked((cur) => (cur.some((x) => x.id === p.id) ? cur.filter((x) => x.id !== p.id) : [...cur, p].slice(0, 19)));
  const group = picked.length > 1;
  const groupBlocked = group && picked.some((p) => !p.mutual);

  const go = () =>
    startTransition(async () => {
      setError(null);
      const res = group ? await createGroup(title, picked.map((p) => p.id)) : await startDirect(picked[0].id);
      if (res?.error) setError(res.error);
    });

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{tr("play.msg.to")}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("play.msg.searchPeople")} className="field" autoComplete="off" />
      </label>

      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={tr("play.msg.picked")}>
          {picked.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => toggle(p)} className="chip" aria-label={tr("play.msg.remove", { name: p.tag })}>
                {p.tag} ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul className="divide-y divide-line rounded-xl border border-line">
        {shown.length === 0 ? (
          <li className="p-3 text-sm text-muted">
            {q.trim().length >= 2 ? tr("play.msg.nobodyFound") : tr("play.msg.mutualsHere")}
          </li>
        ) : (
          shown.map((p) => {
            const on = picked.some((x) => x.id === p.id);
            return (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface">
                  <input type="checkbox" checked={on} onChange={() => toggle(p)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.tag}</span>
                    <span className="block truncate text-meta text-muted">@{p.handle}{p.mutual ? tr("play.msg.mutual") : tr("play.msg.toRequests")}</span>
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      {group && (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{tr("play.msg.groupName")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder={tr("play.msg.groupPlaceholder")} className="field" />
        </label>
      )}
      {groupBlocked && <p className="text-sm text-danger">{tr("play.msg.groupMutualsOnly")}</p>}
      {!group && picked[0] && !picked[0].mutual && (
        <p className="text-meta text-muted">{tr("play.msg.requestNote")}</p>
      )}

      <button type="button" onClick={go} disabled={pending || !picked.length || groupBlocked || (group && !title.trim())} className="btn btn-md btn-primary self-start">
        {pending ? tr("play.msg.opening") : group ? tr("play.msg.createGroup", { n: picked.length + 1 }) : tr("play.msg.message")}
      </button>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
