"use client";

// A player's "Call the host" button on their set page (dispute, lag, no-show, a rules question).
import { useState, useTransition } from "react";
import { callHost } from "@/app/host/live-actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export default function CallHostButton({ setId }: { setId: string }) {
  const t = useT();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-sm btn-outline"
        disabled={pending || note?.ok}
        onClick={() =>
          start(async () => {
            const res = await callHost(setId);
            setNote(res.error ? { ok: false, text: res.error } : { ok: true, text: t("entering.hostNotified") });
          })
        }
      >
        <Icon name="alert" /> {t("entering.callHost")}
      </button>
      <span className="text-meta text-muted">{t("entering.callHostHint")}</span>
      {note && <p className={`w-full text-sm ${note.ok ? "text-muted" : "text-danger"}`} role="status">{note.text}</p>}
    </div>
  );
}
