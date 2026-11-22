"use client";

import { useOptimistic, useTransition } from "react";
import { setPingGame } from "@/app/play/actions";
import { GAMES } from "@/lib/games";
import type { PlayGame } from "@/lib/playGames";
import { useT } from "@/lib/i18n/client";
import Icon from "@/components/ui/Icon";

/** One tap to get (or stop) a phone alert when someone tags @matchmaking in this game's chat. */
export default function PingToggle({ game, on }: { game: PlayGame; on: boolean }) {
  const t = useT();
  const [value, setValue] = useOptimistic(on);
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={value}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setValue(!value);
          await setPingGame(game, !value);
        })
      }
      title={t("playnow.ping.help", { game: GAMES[game].short })}
      className={`btn btn-sm ${value ? "btn-primary" : "btn-outline"} inline-flex items-center gap-1`}
    >
      <Icon name="bell" /> {value ? t("playnow.ping.on") : t("playnow.ping.off")}
    </button>
  );
}
