// Clip cards (round 914): a short gameplay clip that loops silently beside a term on the Smash terms &
// tech page, with a line of text (Matthew: the kind of visuals cookbook.gg has). A clip card is an ordinary
// Smashy post: a video of 30 seconds or less whose text has the term's hashtag (#wavedash). It shows on
// the page once a site admin stands behind it: the admin posted it, or reposted someone else's.
// Pure helpers here; the database part is getClipCards in posts.ts.

export const CLIP_CARD_MAX_MS = 30_000;

/** The pattern (Postgres and JavaScript both read it) for "has one of these hashtags as a whole word". */
export function hashtagPattern(tags: string[]): string {
  return `#(${tags.join("|")})([^A-Za-z0-9_]|$)`;
}

/**
 * Which post is the clip for which term: the oldest approved post per hashtag (so the first good clip
 * stays until it's removed). `rows` come oldest first.
 */
export function pickClipCards(
  rows: { id: string; authorId: string; body: string }[],
  admins: ReadonlySet<string>,
  adminReposted: ReadonlySet<string>,
  tags: string[],
): { id: string; tag: string }[] {
  const wanted = new Set(tags);
  const taken = new Set<string>();
  const out: { id: string; tag: string }[] = [];
  for (const r of rows) {
    if (!admins.has(r.authorId) && !adminReposted.has(r.id)) continue;
    for (const m of r.body.matchAll(/#([A-Za-z][A-Za-z0-9_]*)/g)) {
      const tag = m[1].toLowerCase();
      if (!wanted.has(tag) || taken.has(tag)) continue;
      taken.add(tag);
      out.push({ id: r.id, tag });
    }
  }
  return out;
}

/** The post's text as the clip's caption: without its hashtags and links, in one line. */
export function clipCaption(body: string): string {
  return body
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#[A-Za-z][A-Za-z0-9_]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
