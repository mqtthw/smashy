"use client";
// The "Character pages" button on the guest home (round 654, Matthew: "randomly rotate through character
// icons"): a stock icon that changes to a random character every couple of seconds. The page sends the
// list of icon paths; the first one is drawn on the server so nothing jumps when the page loads. People
// who ask their device for less motion get the first icon, standing still.
import { useEffect, useState } from "react";

const EVERY_MS = 1800;

export default function RotatingCharacterIcon({ icons, size = 20 }: { icons: string[]; size?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (icons.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setI((now) => {
        const next = Math.floor(Math.random() * (icons.length - 1));
        return next >= now ? next + 1 : next; // never the same one twice in a row
      });
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [icons.length]);
  if (!icons.length) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={icons[i]} src={icons[i]} alt="" aria-hidden="true" width={size} height={size} className="shrink-0" style={{ width: size, height: size }} />
  );
}
