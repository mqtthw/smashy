"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";

const noop = () => () => {};

type Stream = { source: string; name: string };

function streamUrl(s: Stream) {
  if (s.source === "TWITCH") return `https://www.twitch.tv/${encodeURIComponent(s.name)}`;
  if (s.source === "YOUTUBE") return `https://www.youtube.com/results?search_query=${encodeURIComponent(s.name)}`;
  return null;
}

/**
 * The tournament's streams. While it's live, the main Twitch stream plays right here;
 * the other streams (side stages, other games) are links. Once it's over, just the links (no promise
 * that the stream will play here).
 */
export default function LiveStream({ streams, live, over = false }: { streams: Stream[]; live: boolean; over?: boolean }) {
  const t = useT();
  // Twitch only plays embeds when told which site they're on ("parent"); that's known in the browser.
  const hostname = useSyncExternalStore(noop, () => window.location.hostname, () => null);
  const main = streams.find((s) => s.source === "TWITCH");
  const links = streams.flatMap((s) => {
    const href = streamUrl(s);
    return href ? [{ ...s, href }] : [];
  });
  if (!links.length) return null;

  return (
    <section id="watch" className="flex scroll-mt-4 flex-col gap-3">
      <h2 className="font-bold">{live ? t("browse.stream.watchLive") : t("browse.stream.streams")}</h2>
      {live && main && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface">
          {hostname && (
            <iframe
              src={`https://player.twitch.tv/?channel=${encodeURIComponent(main.name)}&parent=${hostname}&muted=true`}
              title={t("browse.stream.liveOnTwitch", { name: main.name })}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              className="h-full w-full"
            />
          )}
        </div>
      )}
      <ul className="flex flex-wrap gap-2">
        {links.map((s) => (
          <li key={s.source + s.name}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
              {s.source === "TWITCH" ? "Twitch" : "YouTube"} · {s.name} ↗
            <NewTab /></a>
          </li>
        ))}
      </ul>
      {!live && !over && <p className="text-meta text-muted">{t("browse.stream.playsHere")}</p>}
    </section>
  );
}
