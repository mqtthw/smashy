// Picking Slippi replays to read (round 762). A replay folder can hold thousands of files (Matthew's
// has 2,958), so the page reads the newest first, a batch at a time, instead of the first 500 it was
// handed (usually the oldest). Plain logic, so it can be tested.

/** How many replays one press reads. About a minute on an ordinary computer. */
export const REPLAY_BATCH = 300;

type Picked = { name: string; lastModified: number };

/** The .slp files, newest first (by when the file was written; Slippi's names carry the time too, as a tie-break). */
export function newestReplays<T extends Picked>(files: T[]): T[] {
  return files
    .filter((f) => f.name.toLowerCase().endsWith(".slp"))
    .sort((a, b) => b.lastModified - a.lastModified || b.name.localeCompare(a.name));
}

/** The next batch off the front of the queue, and what's left. */
export function takeBatch<T>(queue: T[], size = REPLAY_BATCH): { batch: T[]; rest: T[] } {
  return { batch: queue.slice(0, size), rest: queue.slice(size) };
}

/** The folder picker's entries, as far as this file needs them (the browser's File System Access API). */
export type DirHandle = { kind: "directory"; name: string; values(): AsyncIterable<DirHandle | FileHandle> };
export type FileHandle = { kind: "file"; name: string; getFile(): Promise<File> };

/**
 * Every .slp file in a picked folder and the folders inside it (Slippi keeps one folder per month).
 * Stops at `max` files and 4 folders deep, so picking a whole drive by mistake doesn't hang the page.
 */
export async function replaysInFolder(dir: DirHandle, max = 20000, depth = 0, out: File[] = []): Promise<File[]> {
  for await (const entry of dir.values()) {
    if (out.length >= max) break;
    if (entry.kind === "file") {
      if (entry.name.toLowerCase().endsWith(".slp")) out.push(await entry.getFile());
    } else if (depth < 4) {
      await replaysInFolder(entry, max, depth + 1, out);
    }
  }
  return out;
}
