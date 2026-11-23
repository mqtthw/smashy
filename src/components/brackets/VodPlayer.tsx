"use client";

import { useSyncExternalStore } from "react";
import { usePageShown } from "@/lib/usePageShown";

const noop = () => () => {};

/** Twitch VOD player, starting at the moment the set began. */
export default function VodPlayer({ videoId, time, title }: { videoId: string; time: string; title: string }) {
  // Twitch only plays embeds when told which site they're on ("parent"); that's known in the browser.
  const hostname = useSyncExternalStore(noop, () => window.location.hostname, () => null);
  const shown = usePageShown(); // the player goes away while its page is hidden, so its sound stops
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface">
      {shown && hostname && (
        <iframe
          src={`https://player.twitch.tv/?video=v${encodeURIComponent(videoId)}&time=${time}&parent=${hostname}&autoplay=false`}
          title={title}
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          className="h-full w-full"
        />
      )}
    </div>
  );
}
