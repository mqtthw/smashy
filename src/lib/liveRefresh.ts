// Decides WHEN a page that listens for live changes reloads its data. Used by the hosted bracket
// and the inbox.
//  - A burst of changes becomes one reload, and reloads are at least `minGapMs` apart.
//  - A tab in the background doesn't reload; it catches up when it's looked at again (also when it
//    has simply been away a while: a sleeping phone often loses its live connection quietly).
//  - While the live connection is up, nothing reloads unless something changed (plus, if asked, a
//    rare safety reload). Without a connection (dropped, or a network that blocks it) the page
//    reloads on a timer instead, so nobody waits on a stale page.
//  - After the connection comes back from a drop, one reload picks up whatever was missed.
export type LiveRefreshOptions = {
  refresh: () => void;
  /** Wait this long after a change before reloading, so a burst lands together. */
  settleMs?: number;
  /** Extra random wait, so many viewers of one page don't all reload at the same moment. */
  jitterMs?: number;
  /** Reloads are at least this far apart. */
  minGapMs?: number;
  /** With the live connection up: a safety reload this often. 0 = never. */
  connectedEveryMs?: number;
  /** Without a live connection: reload this often. 0 = never. */
  offlineEveryMs?: number;
  /** Coming back to the tab after this long without a reload triggers one. */
  catchUpAfterMs?: number;
  isVisible?: () => boolean;
  random?: () => number;
};

export type LiveRefresh = {
  /** Something changed. */
  onChange: () => void;
  /** The tab was shown or hidden. */
  onVisible: () => void;
  /** The live connection went up (true) or down (false). */
  onStatus: (connected: boolean) => void;
  stop: () => void;
};

const POLL_MS = 5_000;

export function liveRefresh(opts: LiveRefreshOptions): LiveRefresh {
  const settle = opts.settleMs ?? 1200;
  const jitter = opts.jitterMs ?? 800;
  const minGap = opts.minGapMs ?? 5_000;
  const connectedEvery = opts.connectedEveryMs ?? 0;
  const offlineEvery = opts.offlineEveryMs ?? 0;
  const catchUpAfter = opts.catchUpAfterMs ?? 30_000;
  const visible = opts.isVisible ?? (() => document.visibilityState === "visible");
  const random = opts.random ?? Math.random;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastReload = Date.now();
  let missed = false; // something changed while this tab was in the background
  let connected = false;
  let dropped = false; // the connection was up and then went down

  const reload = () => {
    timer = null;
    if (!visible()) {
      missed = true;
      return;
    }
    missed = false;
    lastReload = Date.now();
    opts.refresh();
  };
  const onChange = () => {
    if (timer) return; // a reload is already on its way; it will pick this change up too
    timer = setTimeout(reload, Math.max(settle, lastReload + minGap - Date.now()) + random() * jitter);
  };
  const poll =
    connectedEvery || offlineEvery
      ? setInterval(() => {
          if (timer || !visible()) return;
          const every = connected ? connectedEvery : offlineEvery;
          if (every && Date.now() - lastReload >= every) reload();
        }, POLL_MS)
      : null;

  return {
    onChange,
    onVisible() {
      if (visible() && (missed || Date.now() - lastReload >= catchUpAfter)) onChange();
    },
    onStatus(up) {
      if (up && !connected && dropped) {
        dropped = false;
        onChange();
      }
      if (!up && connected) dropped = true;
      connected = up;
    },
    stop() {
      if (timer) clearTimeout(timer);
      if (poll) clearInterval(poll);
    },
  };
}
