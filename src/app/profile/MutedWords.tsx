"use client";

import { useOptimistic, useState, useTransition } from "react";
import { showToast } from "@/components/ui/Toaster";
import { setMutedWords } from "./actions";
import { useT } from "@/lib/i18n/client";

/** Muted words and phrases: posts with them stay out of your feeds (only you can see this list). */
export default function MutedWords({ words }: { words: string[] }) {
  const t = useT();
  const [list, setList] = useOptimistic(words);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const save = (next: string[]) =>
    startTransition(async () => {
      setList(next);
      const res = await setMutedWords(next);
      if (res.error) showToast(res.error);
    });
  const add = () => {
    const w = draft.trim().toLowerCase();
    if (!w || list.includes(w)) return setDraft("");
    setDraft("");
    save([...list, w]);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-semibold">{t("people.muted.title")}</legend>
      <p className="-mt-1 text-meta text-muted">{t("people.muted.help")}</p>
      <div className="flex gap-2">
        <input
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={t("people.muted.placeholder")}
          aria-label={t("people.muted.aria")}
          className="field min-w-0 flex-1 py-1.5"
        />
        <button type="button" onClick={add} disabled={!draft.trim()} className="btn btn-sm btn-outline">{t("people.muted.mute")}</button>
      </div>
      {list.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("people.muted.title")}>
          {list.map((w) => (
            <li key={w} className="flex items-center gap-1 rounded-full border border-line py-0.5 pl-3 pr-1 text-sm">
              {w}
              <button type="button" onClick={() => save(list.filter((x) => x !== w))} className="rounded-full px-1.5 text-muted hover:bg-surface hover:text-foreground" aria-label={t("people.muted.unmute", { word: w })}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
