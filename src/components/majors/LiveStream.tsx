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
 * the other streams (side stages, other games) are links, the first four shown. Once it's over, nothing
 * (round 875).
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
  // The same channel listed twice (start.gg allows it, e.g. in different letter case) shows once.
  const seen = new Set<string>();
  const links = streams.flatMap((s) => {
    const href = streamUrl(s);
    const key = `${s.source}:${s.name.toLowerCase()}`;
    if (!href || seen.has(key)) return [];
    seen.add(key);
    return [{ ...s, href }];
  });
  // Round 875: once it's over, no stream buttons. A finished CEO listed 11 channels, other games' among
  // them, months later; the sets and VODs are what's worth watching then.
  if (!links.length || over) return null;
  const SHOWN = 4; // big events list a channel per stage and game: the rest fold under "more"
  const button = (s: (typeof links)[number]) => (
    <li key={s.source + s.name}>
      <a href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
        {s.source === "TWITCH" ? "Twitch" : "YouTube"} · {s.name} ↗︎
      <NewTab /></a>
    </li>
  );

  return (
    <section id="watch" className="flex scroll-mt-4 flex-col gap-3">
      <h2 className="font-bold">{live ? t("browse.stream.watchLive") : t("browse.stream.streams")}</h2>
      {live && main && (
        // The spot the layout's player is laid over.
        <div ref={slot} className="aspect-video w-full rounded-xl bg-surface" />
      )}
      <ul className="flex flex-wrap gap-2">{links.slice(0, SHOWN).map(button)}</ul>
      {links.length > SHOWN && (
        <details>
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground">{t("browse.stream.more", { n: links.length - SHOWN })}</summary>
          <ul className="mt-2 flex flex-wrap gap-2">{links.slice(SHOWN).map(button)}</ul>
        </details>
      )}
      {!live && <p className="text-meta text-muted">{t("browse.stream.playsHere")}</p>}
    </section>
  );
}
