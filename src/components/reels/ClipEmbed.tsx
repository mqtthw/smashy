"use client";

import { useSyncExternalStore } from "react";
import { embedUrl, platformName, type ReelPlatform } from "@/lib/reelLinks";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";

const noop = () => () => {};

/** The player's box: wide for Twitch clips, tall for YouTube Shorts (sized to leave room for the title and buttons). */
export function clipFrameClass(platform: ReelPlatform) {
  return platform === "youtube" ? "mx-auto aspect-[9/16] h-[60dvh] max-w-full" : "aspect-video w-full";
}

/** YouTube's rules: say that YouTube plays the video, and link its terms and Google's privacy policy. */
export function YouTubeNotice() {
  const t = useT();
  return (
    <p className="text-meta text-muted">
      {t("media.reels.playedByYouTube")}{" "}
      <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="link">{t("media.reels.ytTerms")}<NewTab /></a> ·{" "}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="link">{t("media.reels.googlePrivacy")}<NewTab /></a>
    </p>
  );
}

/** The clip's player (Twitch needs this site's hostname as "parent", known only in the browser). */
export default function ClipEmbed({ clipId, platform, title, autoplay = false }: { clipId: string; platform: ReelPlatform; title: string; autoplay?: boolean }) {
  const hostname = useSyncExternalStore(noop, () => window.location.hostname, () => null);
  const t = useT();
  return (
    <div className={`overflow-hidden rounded-xl bg-black ${clipFrameClass(platform)}`}>
      {hostname && (
        <iframe
          src={embedUrl({ clipId, platform }, hostname, autoplay)}
          title={title || t("media.reels.frameTitle", { platform: platformName(platform) })}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          className="h-full w-full"
        />
      )}
    </div>
  );
}
