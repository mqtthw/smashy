// Shared (server and browser) pieces of "I want to play now" (round 398). Server reads are in playNow.ts.
import type { GameKey } from "./games";

/** Games that have a Play room (and so can be asked for, pinged or saved a code for). */
export const PLAY_GAMES = ["melee", "ultimate", "pplus", "smash64", "brawl", "smash4"] as const satisfies readonly GameKey[];
export type PlayGame = (typeof PLAY_GAMES)[number];
export const isPlayGame = (g: unknown): g is PlayGame => typeof g === "string" && (PLAY_GAMES as readonly string[]).includes(g);

/** Minutes the "Looking to play" switch can stay on for. */
export const LOOKING_MINUTES = [30, 60, 120] as const;

export type PlayRequest = {
  id: string;
  game: PlayGame;
  status: "pending" | "accepted" | "declined" | "cancelled";
  incoming: boolean; // they asked you
  other: { id: string; tag: string; handle: string; avatarUrl: string | null };
  createdAt: string;
  expiresAt: string;
  answeredAt: string | null;
};

export type PlayFriend = { id: string; tag: string; handle: string; avatarUrl: string | null; lookingGame: PlayGame | null; lookingUntil: string | null };

export type MyPlaySettings = { pingGames: PlayGame[]; lookingGame: PlayGame | null; lookingUntil: string | null; codes: Partial<Record<PlayGame, string>> };

/** Does this chat message tag @matchmaking? (The database uses the same rule.) */
export const tagsMatchmaking = (text: string) => /(^|[^A-Za-z0-9_])@matchmaking([^A-Za-z0-9_]|$)/i.test(text);
