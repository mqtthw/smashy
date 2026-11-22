// "Help build Smashy" (/help, round 653): checking what someone sent before it's saved. Kept free of
// server-only code so it can be tested on its own (tests/unit/suggestionForm.test.ts).
import { isGameKey, type GameKey } from "./games";

export const SUGGESTION_KINDS = ["resource", "local", "history", "feedback"] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export type CleanSuggestion = {
  kind: SuggestionKind;
  game: GameKey | null;
  character: string | null;
  link: string | null;
  details: string;
  contact: string | null;
};

/** Why a suggestion can't be saved, as a phrase key on the form. */
export type SuggestionProblem = "kind" | "link" | "needLink" | "needDetails" | "tooLong";

const field = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** A link that's safe to keep and show to admins: http(s) only, no spaces. */
export function cleanLink(value: string): string | null | false {
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".") || /\s/.test(value)) return false;
    return url.toString().length <= 500 ? url.toString() : false;
  } catch {
    return false;
  }
}

/** Checks the form. A resource needs its link; the others need a few words (or a link). */
export function readSuggestion(form: FormData): { ok: CleanSuggestion } | { error: SuggestionProblem } {
  const kind = field(form.get("kind"));
  if (!(SUGGESTION_KINDS as readonly string[]).includes(kind)) return { error: "kind" };
  const game = field(form.get("game"));
  const character = field(form.get("character"));
  const details = field(form.get("details"));
  const contact = field(form.get("contact"));
  const link = cleanLink(field(form.get("link")));
  if (link === false) return { error: "link" };
  if (character.length > 60 || details.length > 2000 || contact.length > 200) return { error: "tooLong" };
  if (kind === "resource" && !link) return { error: "needLink" };
  if (!link && details.length < 3) return { error: "needDetails" };
  return {
    ok: {
      kind: kind as SuggestionKind,
      game: isGameKey(game) ? game : null,
      character: kind === "resource" && character ? character : null,
      link,
      details,
      contact: contact || null,
    },
  };
}
