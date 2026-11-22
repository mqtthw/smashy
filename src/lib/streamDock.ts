// The live stream that keeps playing while you move around Smashy (round 718). A tournament page
// hands its stream to the one player in the layout (components/majors/StreamDock.tsx) and says where
// on the page it belongs (the "slot"). Leave the page and the same player floats in a corner instead of
// being thrown away, so Twitch doesn't start over (and show its ad again) each time you look at the
// bracket and come back. Browser-only state, nothing saved.

export type DockedStream = {
  channel: string; // Twitch channel name
  eventName: string;
  eventPath: string; // the tournament's page, for the floating player's link back
};

type State = { stream: DockedStream | null; slot: HTMLElement | null };

let state: State = { stream: null, slot: null };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  for (const l of listeners) l();
}

export function subscribeStreamDock(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getStreamDock = () => state;
const EMPTY: State = { stream: null, slot: null };
export const getStreamDockOnServer = () => EMPTY;

/** A tournament page shows its stream: play it in `slot` (same channel already playing: it just moves back). */
export function showStream(stream: DockedStream, slot: HTMLElement) {
  const same = state.stream?.channel === stream.channel;
  set({ stream: same ? { ...state.stream!, ...stream } : stream, slot });
}

/** The page that owned `slot` went away: the stream keeps playing, floating. */
export function releaseStreamSlot(slot: HTMLElement) {
  if (state.slot === slot) set({ ...state, slot: null });
}

/** The ✕ on the floating player. */
export function closeStream() {
  set(EMPTY);
}

/** For tests. */
export function resetStreamDock() {
  state = EMPTY;
  listeners.clear();
}
