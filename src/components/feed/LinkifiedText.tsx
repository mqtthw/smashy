// Shows post text with line breaks kept, web links clickable, @handles linked to profiles, and #hashtags linked:
// character hashtags (#SSBU_CLOUD, #fox) go to that character's hub page, others to a tag page.
// Text between ||double bars|| is a spoiler, hidden until tapped.
// React escapes the text, so nothing a user types can run as code.
import Link from "next/link";
import { InlineSpoiler } from "@/components/ui/Spoiler";
import type { GameKey } from "@/lib/games";
import { parseHashtag } from "@/lib/hashtags";
import { INLINE_SPOILER } from "@/lib/spoilerText";
import NewTab from "@/components/ui/NewTab";

const TOKEN_RE = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|((?:^|(?<=[^\w&]))#[A-Za-z][A-Za-z0-9_]{1,40})|((?:^|(?<=[^\w&]))@[A-Za-z0-9_]{3,20})/g;


/** `players`: when given, only these @handles (lowercase) are linked; the rest stay plain text. */
export default function LinkifiedText({ text, game, players }: { text: string; game?: GameKey | null; players?: readonly string[] }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_SPOILER)) {
    if (m.index! > last) out.push(...linkify(text.slice(last, m.index!), game, `t${last}`, players));
    out.push(<InlineSpoiler key={`s${m.index}`}>{linkify(m[1], game, `s${m.index}`, players)}</InlineSpoiler>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(...linkify(text.slice(last), game, `t${last}`, players));
  return <p className="whitespace-pre-wrap break-words">{out}</p>;
}

function linkify(text: string, game: GameKey | null | undefined, keyPrefix: string, players?: readonly string[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const start = m.index!;
    if (start > last) out.push(text.slice(last, start));
    const [token, url, tag, mention] = m;
    if (url) {
      const shown = url.replace(/^https?:\/\//, "");
      out.push(
        <a key={`${keyPrefix}-${start}`} href={url} target="_blank" rel="nofollow ugc noopener noreferrer" className="text-brand hover:underline">
          {shown.slice(0, 60)}
          {shown.length > 60 ? "…" : ""}
        <NewTab /></a>,
      );
    } else if (tag) {
      const p = parseHashtag(tag, game ?? null);
      const href = p.game && p.character ? `/games/${p.game}/${p.character}` : `/tags/${encodeURIComponent(p.raw.toLowerCase())}`;
      out.push(
        <Link key={`${keyPrefix}-${start}`} href={href} className="text-brand hover:underline">
          {tag}
        </Link>,
      );
    } else if (mention && players && !players.includes(mention.slice(1).toLowerCase())) {
      out.push(mention); // not a Smashy player (an X or Twitch name): plain text, no dead link
    } else if (mention) {
      out.push(
        <Link key={`${keyPrefix}-${start}`} href={`/u/${mention.slice(1).toLowerCase()}`} className="text-brand hover:underline">
          {mention}
        </Link>,
      );
    } else {
      out.push(token);
    }
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
