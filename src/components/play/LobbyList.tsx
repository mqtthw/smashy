"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import CopyButton from "@/components/ui/CopyButton";
import { closeLobby } from "@/app/play/actions";
import GameBadge from "@/components/GameBadge";
import type { Lobby } from "@/lib/play";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import LiveReportButton from "./LiveReportButton";
import OpenSlippi from "./OpenSlippi";
import { useNow } from "./useNow";
import { useT } from "@/lib/i18n/client";

export default function LobbyList({ lobbies, viewerId, serverNow }: { lobbies: Lobby[]; viewerId: string; serverNow: number }) {
  const router = useRouter();
  const now = useNow(serverNow);
  const [pending, startTransition] = useTransition();
  const t = useT();

  // Refresh the list whenever any lobby opens or closes.
  useEffect(
    () =>
      subscribeAsUser((supabase) =>
        supabase.channel("lobbies").on("postgres_changes", { event: "*", schema: "public", table: "lobbies" }, () => router.refresh()),
      ),
    [router],
  );

  const open = lobbies.filter((l) => Date.parse(l.closesAt) > now);
  if (open.length === 0) return <p className="px-4 py-3 text-sm text-muted">{t("play.lobbies.none")}</p>;

  return (
    <ul className="divide-y divide-line">
      {open.map((l) => {
        const minsLeft = Math.max(1, Math.round((Date.parse(l.closesAt) - now) / 60000));
        const mine = l.hostId === viewerId;
        return (
          <li key={l.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex items-center gap-2">
              <GameBadge game={l.game} />
              <p className="min-w-0 flex-1 truncate font-semibold">{l.title}</p>
              <span className="shrink-0 text-xs text-muted">{t("play.lobbies.left", { time: minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` : `${minsLeft}m` })}</span>
            </div>
            <p className="text-xs text-muted">
              {l.hostTag} · {l.region} · {t(`play.mode.${l.mode}`)} · {t(`play.skill.${l.skill}`)}
            </p>
            {l.notes && <p className="text-sm">{l.notes}</p>}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">{t(`play.code.${l.game}`)}:</span>
              <code className="rounded bg-surface px-1.5 py-0.5 font-mono">{l.connectInfo}</code>
              <CopyButton text={l.connectInfo} />
              {l.game === "melee" && !mine && <OpenSlippi code={l.connectInfo} />}
              <span className="ml-auto">
                {mine ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => closeLobby(l.id))}
                    className="text-xs text-muted underline"
                  >
                    {t("play.lobbies.close")}
                  </button>
                ) : (
                  <LiveReportButton kind="lobby" targetId={l.id} />
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
