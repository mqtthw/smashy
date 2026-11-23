"use client";

// Is the page this component sits on actually on screen? Next keeps a page you leave alive but hidden
// (so going back is instant), and anything playing on it kept playing: a clip's sound carried on after
// you left the Feed. When a page is hidden React runs its effects' cleanups, and runs the effects again
// when it's shown; this hook turns that into a true/false and a "just got hidden" callback, so players
// can stop. (Reels has done the same by hand since round 503.)
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function usePageShown(onHidden?: () => void): boolean {
  const [shown, setShown] = useState(true);
  const callback = useRef(onHidden);
  useEffect(() => {
    callback.current = onHidden;
  });
  useLayoutEffect(() => {
    setShown(true); // eslint-disable-line react-hooks/set-state-in-effect -- shown again after being hidden
    return () => {
      setShown(false);
      callback.current?.();
    };
  }, []);
  return shown;
}
