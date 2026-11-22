// @handles: unique, lowercase, used in profile URLs (/u/handle). Shared by server and browser.
// Also the rules for tags (display names): no invisible names, and nothing that looks like Smashy staff.

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set(["admin", "smashy", "mod", "moderator", "support", "staff", "official", "help", "me", "settings"]);
/** A handle with one of these as a whole part ("the_admin", "mod_team") reads like staff. */
const STAFF_PARTS = new Set(["admin", "administrator", "mod", "mods", "moderator", "staff", "support", "official", "safety"]);

/** Suggest a handle from a tag, e.g. "Mang0 ✨" -> "mang0". */
export function suggestHandle(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

/** A friendly problem description, or null if the handle is valid. `staff`: site admins may use staff-like names. */
export function handleProblem(handle: string, opts: { staff?: boolean } = {}): string | null {
  if (!HANDLE_RE.test(handle)) return "Handles are 3–20 characters: lowercase letters, numbers, and _.";
  if (RESERVED.has(handle)) return "That handle is reserved. Try another.";
  if (!opts.staff && (handle.startsWith("smashy") || handle.split("_").some((part) => STAFF_PARTS.has(part)))) {
    return "That handle looks like Smashy staff. Try another.";
  }
  return null;
}

/**
 * Tidy a tag before saving: one standard form of each character, no control or invisible
 * characters (zero-width spaces, blank "filler" letters), single spaces. The joiner inside
 * combined emoji is kept.
 */
export function cleanTag(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/\s+/g, " ") // tabs and line breaks count as spaces, not as characters to drop
    .replace(/[\p{Cc}ᅟᅠㅤﾠ⠀]|(?!‍)\p{Cf}/gu, "")
    .replace(/ +/g, " ")
    .trim();
}

/** A friendly problem description, or null if the (already cleaned) tag is fine. */
export function tagProblem(tag: string, opts: { staff?: boolean } = {}): string | null {
  if (tag.length < 1 || tag.length > 30) return "Your tag should be 1–30 characters.";
  // Something has to show: not just spaces, joiners or accent marks.
  if (!tag.replace(/[\s‍\p{M}]/gu, "")) return "Your tag needs at least one visible character.";
  if (!opts.staff && (/smashy/i.test(tag) || /(^|[^a-z0-9])(admin|administrator|moderator|staff)([^a-z0-9]|$)/i.test(tag) || /\b(support|safety|mod|moderation|official) team\b/i.test(tag))) {
    return "That tag looks like Smashy staff. Try another.";
  }
  return null;
}
