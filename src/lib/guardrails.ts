// Chat/lobby guardrails: no links or contact info (same rules for everyone).
// Returns a friendly reason if the text is blocked, or null if it's fine.
// The database has a matching backstop, so these rules can't be bypassed.
import { chatTextForCheck } from "./characterTags";

const RULES: { test: RegExp; reason: string }[] = [
  { test: /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|gg|io|me|tv|co|ly|app|link|xyz)\b)/i, reason: "Links aren't allowed in chat." },
  { test: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, reason: "Email addresses aren't allowed in chat." },
  { test: /(\d[\s().-]?){9}\d/, reason: "Phone numbers aren't allowed in chat." },
  { test: /(^|\s)@[a-z0-9_.]{2,}/i, reason: "Social media handles aren't allowed in chat." },
  { test: /\b(snap ?chat|instagram|insta|tiktok|whats ?app|telegram|kik)\b/i, reason: "Moving the conversation to other apps isn't allowed here." },
  {
    test: /\b(add|dm|message|hmu|hit me up|text|call) me (on|at|in)\b|\bmy (discord|snap|insta|number|phone|socials?)\b|\bdiscord (id|tag|name|user(name)?)\b/i,
    reason: "Sharing or asking for contact info isn't allowed here.",
  },
];

export function contactInfoReason(text: string): string | null {
  for (const rule of RULES) if (rule.test.test(text)) return rule.reason;
  return null;
}

/**
 * Room chat: the same rules, except the "@matchmaking" tag (round 398) isn't a social media handle.
 * The database's chat rule makes the same exception.
 */
export function chatContactInfoReason(text: string): string | null {
  return contactInfoReason(chatTextForCheck(text));
}

export const CHAT_MAX_LENGTH = 280;
export const CHAT_ROOMS = ["melee", "ultimate", "pplus", "smash64", "brawl", "smash4", "general"] as const;
export type ChatRoom = (typeof CHAT_ROOMS)[number];
