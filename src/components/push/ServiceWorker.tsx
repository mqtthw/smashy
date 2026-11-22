"use client";

import { useEffect } from "react";
import { inFrame } from "@/lib/embed";

/** Registers Smashy's service worker (push notifications and "You're up" alerts on Android). */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || inFrame()) return; // not from inside another website (the bracket embed)
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
