"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { announceOnDiscord, connectDiscord, disconnectDiscord, setDiscordCalls } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

/**
 * Host: connect a Discord channel to the event by pasting its webhook link. Smashy then posts
 * there when the bracket starts, when sets are called, and the results. The link is saved where
 * nobody can read it back, so once connected this only shows that it is.
 */
export default function DiscordCard({ eventId, connected, calls, canAnnounce }: { eventId: string; connected: boolean; calls: boolean; canAnnounce: boolean }) {
  const t = useT();
  const [link, setLink] = useState("");
  const [postCalls, setPostCalls] = useState(calls);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>, done?: string, after?: () => void) =>
    start(async () => {
      setError(null);
      setNote(null);
      try {
        const res = await fn();
        if (res.error) setError(res.error);
        else {
          after?.();
          if (done) setNote(done);
        }
      } catch {
        setError(t("common.offline"));
      }
    });

  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-bold">
        Discord <span className="font-normal text-muted">{connected ? t("hostrun.discord.connected") : t("hostrun.discord.pitch")}</span>
      </summary>
      <div className="mt-2 flex flex-col gap-3 text-sm">
        {connected ? (
          <>
            <p className="text-muted">
              {t("hostrun.discord.connectedHint")}
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={postCalls}
                disabled={pending}
                onChange={(e) => {
                  const on = e.target.checked;
                  setPostCalls(on);
                  run(() => setDiscordCalls(eventId, on), on ? t("hostrun.discord.callsOn") : t("hostrun.discord.callsOff"), undefined);
                }}
                className="h-4 w-4"
              />
              {t("hostrun.discord.postCalls")} (&ldquo;Set C: Ben vs Gus → Setup 1&rdquo;)
            </label>
            <div className="flex flex-wrap gap-2">
              {canAnnounce && (
                <button type="button" disabled={pending} onClick={() => run(() => announceOnDiscord(eventId), t("hostrun.discord.postedLink"))} className="btn btn-sm btn-primary">
                  {t("hostrun.discord.postLink")}
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => window.confirm(t("hostrun.discord.disconnectConfirm")) && run(() => disconnectDiscord(eventId), t("hostrun.discord.disconnected"))}
                className="btn btn-sm btn-outline"
              >
                {t("hostrun.discord.disconnect")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted">
              {t("hostrun.discord.setupBefore")} <b className="text-foreground">{t("hostrun.discord.setupPath")}</b>
              {t("hostrun.discord.setupAfter")}
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (link.trim()) run(() => connectDiscord(eventId, link), t("hostrun.discord.connectedNote"), () => setLink(""));
              }}
            >
              <input
                type="password"
                autoComplete="off"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                maxLength={300}
                aria-label={t("hostrun.discord.linkLabel")}
                placeholder="https://discord.com/api/webhooks/…"
                className="field min-w-0 flex-1 py-1.5"
              />
              <button type="submit" disabled={pending || !link.trim()} className="btn btn-sm btn-primary">
                {pending ? t("hostrun.discord.checking") : t("hostrun.discord.connect")}
              </button>
            </form>
            <p className="text-meta text-muted">{t("hostrun.discord.keyNote")}</p>
          </>
        )}
        {error && <p role="alert" className="text-danger">{error}</p>}
        {note && <p role="status" className="text-muted">{note}</p>}
        <Link href="/host/discord" className="link text-meta">{t("hostrun.bot.link")}</Link>
      </div>
    </details>
  );
}
