// One live value shared by every component that shows it. The first component to use it starts the
// work (one query, one live connection); the others just listen; when the last one goes away the
// work stops. Without this, two unread badges on one screen meant two queries and two connections.
export type SharedLive<T> = { subscribe: (listener: () => void) => () => void; get: () => T };

export function sharedLive<T>(initial: T, start: (set: (next: T | ((prev: T) => T)) => void) => () => void): SharedLive<T> {
  let value = initial;
  let stop: (() => void) | null = null;
  const listeners = new Set<() => void>();
  const set = (next: T | ((prev: T) => T)) => {
    const v = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    if (Object.is(v, value)) return;
    value = v;
    for (const l of [...listeners]) l();
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) stop = start(set);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stop?.();
          stop = null;
          value = initial;
        }
      };
    },
    get: () => value,
  };
}
