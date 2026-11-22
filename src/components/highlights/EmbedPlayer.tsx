"use client";

import { useSyncExternalStore } from "react";
import type { Embed } from "@/lib/embeds";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";

const noop = () => () => {};

/** Video player for allowlisted sites, or a link card for everything else. */
export default function EmbedPlayer({ embed }: { embed: Embed }) {
  // Twitch needs this site's hostname ("parent"); it's only known in the browser.
  const hostname = useSyncExternalStore(noop, () => window.location.hostname, () => null);
  const t = useT();

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

  const src = embed.needsTwitchParent ? (hostname ? `${embed.src}&parent=${hostname}` : null) : embed.src;
  return (
    <div className="flex flex-col gap-1">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface">
        {src && (
          <iframe
            src={src}
            title={t("media.hl.video", { provider: embed.provider })}
            loading="lazy"
            allow="fullscreen; picture-in-picture; encrypted-media"
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
