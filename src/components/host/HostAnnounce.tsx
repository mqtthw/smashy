"use client";

// Host: send a short message to everyone signed up (a notification, and a push if they allow them).
import { useState, useTransition } from "react";
import { announceToPlayers } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

export default function HostAnnounce({ eventId, players }: { eventId: string; players: number }) {
  const t = useT();
  const [text, setText] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      setNote(null);
      const res = await announceToPlayers(eventId, text);
      if (res.error) setNote({ ok: false, text: res.error });
      else {
        setText("");
        setNote({ ok: true, text: t("hostrun.announce.sent", { n: players }) });
      }
    });
  return (
    <section className="card flex flex-col gap-2 p-4" aria-labelledby="announce">
      <h2 id="announce" className="font-bold">{t("hostrun.announce.title")}</h2>
      <p className="text-meta text-muted">{t("hostrun.announce.hint")}</p>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="announce-text" className="sr-only">{t("hostrun.announce.label")}</label>
        <input
          id="announce-text"
          className="field min-w-0 flex-1"
          maxLength={160}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("hostrun.announce.placeholder")}
        />
        <button type="submit" className="btn btn-primary" disabled={pending || text.trim().length < 3}>
          {pending ? t("hostrun.announce.sending") : t("hostrun.announce.send")}
        </button>
      </form>
      {note && <p className={`text-sm ${note.ok ? "text-muted" : "text-danger"}`} role="status">{note.text}</p>}
    </section>
  );
}
