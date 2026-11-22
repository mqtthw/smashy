"use client";

import { useState, useTransition } from "react";
import { addVod, removeVod } from "@/app/vods/actions";
import { readVodLink, type VodSource } from "@/lib/vods";
import { useT } from "@/lib/i18n/client";

/** Add a video of this set: paste a YouTube, Twitch or Streamable link. */
export function VodForm({ source, setId }: { source: VodSource; setId: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const [link, setLink] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-sm btn-outline self-start">
        {t("vods.add")}
      </button>
    );
  }
  const looksOk = !!readVodLink(link);
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          try {
            const res = await addVod(source, setId, link);
            if (res.error) setError(res.error);
            else {
              setLink("");
              setOpen(false);
            }
          } catch {
            setError(t("common.offline"));
          }
        });
      }}
    >
      <label htmlFor={`vod-${setId}`} className="text-sm font-semibold">{t("vods.linkLabel")}</label>
      <div className="flex gap-2">
        <input
          id={`vod-${setId}`}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={300}
          inputMode="url"
          placeholder={t("vods.placeholder")}
          className="field min-w-0 flex-1 py-1.5"
        />
        <button type="submit" disabled={pending || !looksOk} className="btn btn-sm btn-primary">
          {pending ? t("vods.adding") : t("vods.addButton")}
        </button>
      </div>
      <p className="text-meta text-muted">{t("vods.help")}</p>
      {link && !looksOk && <p className="text-meta text-muted">{t("vods.notYet")}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}

/** Take a video off the set (shown to whoever added it, and to site admins). */
export function RemoveVod({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          window.confirm(t("vods.removeConfirm")) &&
          start(async () => {
            const res = await removeVod(id);
            setError(res.error ?? null);
          })
        }
        className="text-meta text-muted underline"
      >
        {pending ? t("vods.removing") : t("vods.remove")}
      </button>
      {error && <span role="alert" className="text-meta text-danger">{error}</span>}
    </span>
  );
}
