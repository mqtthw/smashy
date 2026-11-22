"use client";

import { useState, useTransition } from "react";
import { requestSceneAdmin } from "@/app/scenes/actions";
import { useT } from "@/lib/i18n/client";

export default function RequestAdminButton({ sceneId }: { sceneId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-muted underline">
        {t("media.admin.ask")}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 card p-3 text-sm">
      <label htmlFor="admin-msg" className="font-semibold">{t("media.admin.why")}</label>
      <textarea
        id="admin-msg"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder={t("media.admin.placeholder")}
        className="field p-2"
      />
      {error && <p className="text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 text-muted">{t("common.cancel")}</button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await requestSceneAdmin(sceneId, message);
              if (res.error) setError(res.error);
            })
          }
          className="btn btn-sm btn-inverse"
        >
          {t("media.req.send")}
        </button>
      </div>
    </div>
  );
}
