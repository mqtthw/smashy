"use client";

import { useState, useSyncExternalStore } from "react";
import type { Embed } from "@/lib/embeds";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";

const noop = () => () => {};

/** Video player for allowlisted sites, or a link card for everything else. */
export default function EmbedPlayer({ embed }: { embed: Embed }) {
  // Twitch needs this site's hostname ("parent"); it's only known in the browser.
  const hostname = useSyncExternalStore(noop, () => window.location.hostname, () => null);
  const t = useT();
  const [started, setStarted] = useState(false);

  if (embed.kind === "link") {
    return (
      <a href={embed.href} target="_blank" rel="nofollow ugc noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-surface">
        <span className="min-w-0">
          <span className="block text-xs text-muted">{embed.provider}</span>
          <span className="block truncate text-sm text-brand">{embed.href.replace(/^https:\/\//, "")}</span>
        </span>
        <span className="shrink-0 text-sm">{t("media.hl.open")}</span>
      <NewTab /></a>
    );
  }

  // YouTube (round 743): its player is about half a megabyte of script, and a Feed can have several on
  // screen. Until someone presses play, show the video's own still picture with a play button; the
  // press loads the player and starts it, so it's still one press to watch.
  const youtubeId = embed.provider === "YouTube" ? embed.src.match(/\/embed\/([A-Za-z0-9_-]{6,20})/)?.[1] : undefined;
  const waiting = !!youtubeId && !started;
  const withAutoplay = (url: string) => `${url}${url.includes("?") ? "&" : "?"}autoplay=1`;
  const base = embed.needsTwitchParent ? (hostname ? `${embed.src}&parent=${hostname}` : null) : embed.src;
  const src = base && youtubeId ? withAutoplay(base) : base;
  return (
    <div className="flex flex-col gap-1">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface">
        {waiting ? (
          <button type="button" onClick={() => setStarted(true)} aria-label={t("media.hl.playVideo")} className="group relative block h-full w-full bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-black/60 pl-1 text-2xl text-white group-hover:bg-black/75">▶</span>
            </span>
          </button>
        ) : src && (
          <iframe
            src={src}
            title={t("media.hl.video", { provider: embed.provider })}
            loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            className="h-full w-full"
          />
        )}
      </div>
      <a href={embed.href} target="_blank" rel="nofollow ugc noopener noreferrer" className="self-end text-xs text-muted hover:text-foreground">
        {t("media.hl.watchOn", { provider: embed.provider })}
      <NewTab /></a>
    </div>
  );
}
