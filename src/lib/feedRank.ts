// Small pure helpers for the For You feed (kept separate so they can be unit-tested).

/** Reorders a page so no one appears more than twice in a row. */
export function spreadAuthors<T extends { post: { author: { id: string } } }>(items: T[]): T[] {
  const out = [...items];
  for (let i = 2; i < out.length; i++) {
    const a = out[i].post.author.id;
    if (a !== out[i - 1].post.author.id || a !== out[i - 2].post.author.id) continue;
    const j = out.findIndex((x, k) => k > i && x.post.author.id !== a);
    if (j === -1) break;
    const [moved] = out.splice(j, 1);
    out.splice(i, 0, moved);
  }
  return out;
}
