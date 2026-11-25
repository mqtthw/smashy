"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";
import { releaseStreamSlot, showStream } from "@/lib/streamDock";

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
 *
 * The player itself lives in the layout (StreamDock, round 718): this page only marks the spot. When
 * you leave for the bracket the same player floats in a corner, so Twitch doesn't restart (and show
 * its ad again) when you come back.
 */
export default function LiveStream({ streams, live, over = false, eventName, eventPath }: { streams: Stream[]; live: boolean; over?: boolean; eventName: string; eventPath: string }) {
  const t = useT();
  const main = streams.find((s) => s.source === "TWITCH");
  const slot = useRef<HTMLDivElement>(null);
  const channel = live && main ? main.name : null;
  useEffect(() => {
    const el = slot.current;
    if (!channel || !el) return;
    showStream({ channel, eventName, eventPath }, el);
    return () => releaseStreamSlot(el); // also when the page is kept but hidden: the stream floats
  }, [channel, eventName, eventPath]);
  const links = streams.flatMap((s) => {
    const href = streamUrl(s);
    return href ? [{ ...s, href }] : [];
  });
  if (!links.length) return null;

  return (
    <section id="watch" className="flex scroll-mt-4 flex-col gap-3">
      <h2 className="font-bold">{live ? t("browse.stream.watchLive") : t("browse.stream.streams")}</h2>
      {live && main && (
        // The spot the layout's player is laid over.
        <div ref={slot} className="aspect-video w-full rounded-xl bg-surface" />
      )}
      <ul className="flex flex-wrap gap-2">
        {links.map((s) => (
          <li key={s.source + s.name}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
              {s.source === "TWITCH" ? "Twitch" : "YouTube"} · {s.name} ↗︎
            <NewTab /></a>
          </li>
        ))}
      </ul>
      {!live && !over && <p className="text-meta text-muted">{t("browse.stream.playsHere")}</p>}
    </section>
  );
}
