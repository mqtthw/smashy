// Emoji reactions. The heart (like) stays separate; these sit next to it.
// The list is curated (keeps reactions on-topic and stops "reacting" with text); the database has a
// copy generated from this list (migration 20261108160000_reactions.sql), so keep them in sync.
// Shared by server and browser code.

export const QUICK_REACTIONS = ["🔥", "😂", "😮", "💀", "👏", "🐐"] as const;

export const ALL_REACTIONS = [
  ...QUICK_REACTIONS,
  "😭", "🤯", "😳", "😤", "😎", "🤣", "😢", "😡", "🤔", "🙃", "🥲", "🫠", "😬", "🤡", "🥶", "🫡",
  "👀", "🙏", "🤝", "💯", "🧠", "🎯", "⚡", "🌊", "🧊", "🏆", "🥇", "👑", "💎", "🚀", "🌟", "🎮",
  "🕹️", "🐢", "🦊", "🐸", "🍿", "🧂", "📈", "📉", "✅", "❌", "🎉", "⚔️", "🛡️", "💪",
] as const;

const ALLOWED = new Set<string>(ALL_REACTIONS);

/** A stored reaction is either one of the emojis above, or "scene:<emoji id>" for a scene emoji. */
export function isValidReaction(value: string): boolean {
  return ALLOWED.has(value) || /^scene:[0-9a-f-]{36}$/.test(value);
}

export const SCENE_EMOJI_NAME = /^[a-z0-9_]{2,32}$/;
export const MAX_REACTIONS_PER_POST = 5; // different emojis one person can add to one post

export type SceneEmoji = { id: string; name: string; url: string; sceneName: string };

export type ReactionSummary = {
  key: string; // the stored value: "🔥" or "scene:<id>"
  count: number;
  mine: boolean;
  scene?: { name: string; url: string } | null; // for scene emojis
};
