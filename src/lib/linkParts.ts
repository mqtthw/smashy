/**
 * Splits text into plain parts and https:// links (round 705), so the official account's messages can show
 * clickable links. Other people's messages stay plain text. A trailing full stop or bracket stays out of the link.
 */
export function linkParts(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(/https:\/\/[^\s<>"]+/g)) {
    let url = m[0];
    while (/[.,!?:;)\]]$/.test(url)) url = url.slice(0, -1);
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at) });
    parts.push({ text: url, href: url });
    last = at + url.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
