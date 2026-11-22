"use client";
// Smashy's own scroll bar for the iPhone app. iOS draws its scroll bar natively and pages can't style
// it, so the app hides it (MainViewController in apps/mobile/ios) and marks the page with
// data-native-scroll; this then draws a slim flame-red bar at the right edge while the page scrolls
// and fades it out after. Anywhere else (browsers, older app builds) it draws nothing.
import { useEffect, useRef } from "react";

const SHOW_MS = 900;

export default function ScrollIndicator() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.documentElement.hasAttribute("data-native-scroll")) return;
    const el = bar.current;
    if (!el) return;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;

    const draw = () => {
      frame = 0;
      const doc = document.documentElement;
      const view = window.innerHeight;
      const total = doc.scrollHeight;
      if (total <= view + 1) {
        el.style.opacity = "0";
        return;
      }
      // The track runs from just below the clock strip to just above the bottom tab bar (when it shows).
      const top = parseFloat(getComputedStyle(doc).getPropertyValue("--scroll-track-top")) || 0;
      const bottom = parseFloat(getComputedStyle(doc).getPropertyValue("--scroll-track-bottom")) || 0;
      const track = view - top - bottom;
      const thumb = Math.max(36, (track * view) / total);
      const progress = Math.min(1, Math.max(0, window.scrollY / (total - view)));
      el.style.height = `${thumb}px`;
      el.style.transform = `translateY(${top + progress * (track - thumb)}px)`;
      el.style.opacity = "1";
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => (el.style.opacity = "0"), SHOW_MS);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(hideTimer);
    };
  }, []);

  return <div ref={bar} aria-hidden="true" className="scroll-indicator" />;
}
