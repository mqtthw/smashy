// ||Inline spoilers|| in post text. Shared by server and browser code.

/** Matches one ||hidden bit|| (up to 300 characters, on one line). */
export const INLINE_SPOILER = /\|\|([^|\n]{1,300})\|\|/g;

/** The text with ||hidden bits|| blacked out, for places that can't be tapped (titles, previews, pushes). */
export function hideInlineSpoilers(text: string): string {
  return text.replace(INLINE_SPOILER, "▒▒▒");
}

/** A short safe preview of a post: "(spoiler)" for spoiler posts, otherwise its title or text, blacked out. */
export function safeSnippet(p: { title?: string | null; body: string; spoiler?: boolean | null }): string {
  return p.spoiler ? "(spoiler)" : hideInlineSpoilers(p.title ?? p.body);
}
