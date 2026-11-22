// Text filter for things other people wrote that Smashy shows to everyone (e.g. Twitch clip titles,
// written by whoever clipped the moment). Smashy is 13+, so:
//   - hateful slurs, sexual content, and links/contact info -> hide the text and flag it for review
//   - everyday swearing -> masked ("f***"), since it's common in clip titles and not worth hiding
// Shared by server and browser code.
import { contactInfoReason } from "./guardrails";

// Letters people swap in to dodge filters.
const L: Record<string, string> = { a: "[a@4]", e: "[e3]", i: "[i1!l|]", o: "[o0]", s: "[s5$]", u: "[uv]", g: "[g9]" };
const loose = (word: string) => word.split("").map((c) => L[c] ?? c).join("+") + "+";

// Hidden outright. Kept short and specific to avoid catching normal words.
const HIDE = [
  // slurs
  "nigger", "nigga", "niggah", "faggot", "fag", "fags", "retard", "retarded", "tranny", "trannies", "kike", "spic", "chink", "coon",
  // sexual
  "porn", "pornhub", "nsfw", "onlyfans", "nudes", "hentai", "rape", "rapist", "cum", "pussy", "dildo", "blowjob",
].map((w) => new RegExp(`(^|[^a-z])${loose(w)}($|[^a-z])`, "i"));

// Masked: first letter kept, the rest starred.
const MASK = /\b(f+u+c+k+(?:ing|in|ed|er|s)?|s+h+i+t+(?:ty|s)?|b+i+t+c+h+(?:es)?|a+s+s+h+o+l+e+s?|d+a+m+n+)\b/gi;

export type CleanText = { text: string; flagged: boolean };

/** Cleans text for display. `flagged` = hidden for review (text comes back empty). */
export function cleanPublicText(raw: string): CleanText {
  const text = raw.normalize("NFKC").trim();
  if (!text) return { text: "", flagged: false };
  if (HIDE.some((re) => re.test(text)) || contactInfoReason(text)) return { text: "", flagged: true };
  return { text: text.replace(MASK, (w) => w[0] + "*".repeat(w.length - 1)), flagged: false };
}
