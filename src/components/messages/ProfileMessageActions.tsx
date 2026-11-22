"use client";

import { useState, useTransition } from "react";
import { blockUser, muteUser, startDirect, unblockUser } from "@/app/messages/actions";
import { reportLive } from "@/app/play/actions";
import { useDismiss } from "@/lib/useDismiss";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

const REPORT_REASONS = [
  { value: "inappropriate", label: "play.msg.reason.inappropriate" },
  { value: "harassment", label: "play.msg.reason.harassment" },
  { value: "spam", label: "play.msg.reason.spam" },
] as const;

/** On someone's profile: Message, and a menu with Mute, Report and Block. */
export default function ProfileMessageActions({
  profileId,
  tag,
  canMessage,
  blocked,
  muted,
}: {
  profileId: string;
  tag: string;
  canMessage: boolean;
  blocked: boolean;
  muted: boolean;
}) {
  const [done, setDone] = useState<string | null>(null);
  const t = useT();
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const box = useDismiss<HTMLDivElement>(menu, () => setMenu(false));

  const run = (fn: () => Promise<{ error?: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      setMenu(false);
    });

  return (
    <div ref={box} className="relative flex shrink-0 items-center gap-2">
      {canMessage && !blocked && (
        <button type="button" disabled={pending} onClick={() => run(() => startDirect(profileId))} className="btn btn-sm btn-outline" aria-label={t("play.msg.messageName", { name: tag })}>
          <Icon name="mail" /> {t("play.msg.message")}
        </button>
      )}
      <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={t("play.msg.moreOptions")} className="btn btn-sm btn-ghost">
        ⋯
      </button>
      {menu && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-line bg-background p-1 text-sm shadow-lg">
          {!blocked && (
            <button type="button" disabled={pending} onClick={() => run(() => muteUser(profileId, !muted))} className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface">
              {muted ? t("play.msg.unmuteName", { name: tag }) : t("play.msg.muteName", { name: tag })}
              <span className="block text-meta text-muted">{muted ? t("play.msg.unmuteNote") : t("play.msg.muteNote")}</span>
            </button>
          )}
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              disabled={pending}
              onClick={() =>
                window.confirm(t("play.msg.reportConfirm", { name: tag, reason: t(r.label) })) &&
                run(async () => {
                  const res = await reportLive("profile", profileId, r.value, "");
                  if (res.ok) setDone(t("report.done"));
                  return res;
                })
              }
              className="w-full rounded-lg px-3 py-1.5 text-left text-meta hover:bg-surface"
            >
              {t("play.msg.reportProfile", { reason: t(r.label) })}
            </button>
          ))}
          {blocked ? (
            <button type="button" disabled={pending} onClick={() => run(() => unblockUser(profileId))} className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface">
              {t("play.msg.unblockName", { name: tag })}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => window.confirm(t("play.msg.blockConfirm", { name: tag })) && run(() => blockUser(profileId))}
              className="w-full rounded-lg px-3 py-2 text-left text-danger hover:bg-surface"
            >
              {t("play.msg.blockName", { name: tag })}
            </button>
          )}
        </div>
      )}
      {done && <p role="status" className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-background p-2 text-meta text-success shadow">{done}</p>}
      {error && <p role="alert" className="absolute right-0 top-full mt-1 w-56 rounded-lg bg-background p-2 text-meta text-danger shadow">{error}</p>}
    </div>
  );
}
