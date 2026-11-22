"use client";

import { useState, useTransition } from "react";
import { updateScene } from "../actions";
import { useT } from "@/lib/i18n/client";

type Link = { label: string; url: string };

/** Scene admins: edit the scene's description and links (Discord, start.gg, socials). */
export default function EditScene({ sceneId, description, links }: { sceneId: string; description: string | null; links: Link[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(description ?? "");
  const [list, setList] = useState<Link[]>(links.length ? links : [{ label: "", url: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-sm btn-outline self-start">
        {t("media.edit.open")}
      </button>
    );
  }
  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await updateScene(sceneId, text, list);
      if (res.error) setError(res.error);
      else setOpen(false);
    });

  return (
    <div className="card flex flex-col gap-3 p-4">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("media.edit.about")} <span className="font-normal text-muted">{t("media.edit.left", { n: 500 - text.length })}</span></span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={3} className="field" placeholder={t("media.edit.aboutPlaceholder")} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("media.edit.links")}</legend>
        <p className="-mt-1 text-meta text-muted">{t("media.edit.linksHelp")}</p>
        {list.map((l, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              value={l.label}
              maxLength={40}
              onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              placeholder={t("media.edit.labelPlaceholder")}
              aria-label={t("media.edit.labelAria", { n: i + 1 })}
              className="field min-w-0 flex-1 py-1.5"
            />
            <input
              value={l.url}
              onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              placeholder="https://"
              inputMode="url"
              aria-label={t("media.edit.urlAria", { n: i + 1 })}
              className="field min-w-0 flex-[2] py-1.5"
            />
            <button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} className="btn btn-sm btn-ghost" aria-label={t("media.edit.removeAria", { n: i + 1 })}>✕</button>
          </div>
        ))}
        {list.length < 6 && (
          <button type="button" onClick={() => setList([...list, { label: "", url: "" }])} className="btn btn-sm btn-ghost self-start">{t("media.edit.addLink")}</button>
        )}
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={pending} className="btn btn-sm btn-primary">{pending ? t("common.saving") : t("common.save")}</button>
        <button
          type="button"
          onClick={() => {
            // Throw away unsaved changes.
            setText(description ?? "");
            setList(links.length ? links : [{ label: "", url: "" }]);
            setError(null);
            setOpen(false);
          }}
          className="btn btn-sm btn-ghost"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
