"use client";

// Online events: a signed-up player saves their connect code (Slippi code, arena ID, friend code)
// on the event page ahead of time, so it's already on every set they play.
import { useState, useTransition } from "react";
import { saveConnectCode } from "@/app/host/live-actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export default function ConnectCodeForm({ eventId, current, placeholder }: { eventId: string; current: string | null; placeholder: string }) {
  const t = useT();
  const [code, setCode] = useState(current ?? "");
  const [saved, setSaved] = useState(current ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="card flex flex-col gap-2 p-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveConnectCode(eventId, code);
          if (res.error) setMsg({ ok: false, text: res.error });
          else {
            setSaved(code.trim());
            setMsg({ ok: true, text: code.trim() ? t("entering.codeSaved") : t("entering.codeRemoved") });
          }
        });
      }}
    >
      <label htmlFor="event-code" className="font-semibold"><Icon name="globe" /> {t("entering.connectCode")}</label>
      <p className="text-meta text-muted">{t("entering.connectCodeHelp")}</p>
      <span className="flex items-center gap-2">
        <input id="event-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} placeholder={placeholder} className="field min-w-0 flex-1 py-1 font-mono" />
        <button disabled={pending || code.trim() === saved} className="btn btn-sm btn-outline">{t("common.save")}</button>
      </span>
      {msg && <span role="status" className={`text-meta ${msg.ok ? "text-muted" : "text-danger"}`}>{msg.text}</span>}
    </form>
  );
}
