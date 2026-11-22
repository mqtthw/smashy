import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { characterName } from "@/lib/characters";
import { toEmbed } from "@/lib/embeds";
import type { Highlight } from "@/lib/highlights";
import { HIGHLIGHT_TYPE_KEYS } from "@/components/hub/TypeTabs";
import { T } from "@/lib/i18n/client";
import EmbedPlayer from "./EmbedPlayer";
import VoteButton from "./VoteButton";

export function HighlightTags({ h }: { h: Highlight }) {
  const character = characterName(h.game, h.character);
  const vs = h.vsCharacter ? characterName(h.game, h.vsCharacter) : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="badge bg-surface-2"><T k={HIGHLIGHT_TYPE_KEYS[h.type]} /></span>
      <GameBadge game={h.game} />
      {character && (
        <span className="badge border border-line font-normal">
          {character}
          {vs && <> <T k="media.vsName" values={{ name: vs }} /></>}
        </span>
      )}
    </div>
  );
}

/** Compact card for profile Highlights tabs (and the resource hub later). */
export default function HighlightCard({ h, viewerId, showAuthor = false }: { h: Highlight; viewerId: string | null; showAuthor?: boolean }) {
  const embed = h.url ? toEmbed(h.url) : null;
  return (
    <article className="flex flex-col gap-2 card p-3">
      <div className="flex items-start justify-between gap-2">
        <HighlightTags h={h} />
        <VoteButton highlightId={h.id} voted={h.votedByMe} count={h.voteCount} signedIn={!!viewerId} isMine={h.author.id === viewerId} />
      </div>
      <Link href={`/h/${h.id}`} className="font-bold hover:underline">{h.title}</Link>
      {showAuthor && (
        <Link href={`/u/${h.author.handle}`} className="-mt-1 text-xs text-muted hover:underline"><T k="media.byTag" values={{ tag: h.author.tag }} /></Link>
      )}
      {h.removed && <p className="rounded-lg bg-surface px-2 py-1 text-xs text-muted"><T k="media.hl.removedByMods" /></p>}
      {embed && <EmbedPlayer embed={embed} />}
      {h.description && <p className="text-sm">{h.description}</p>}
      {h.guideBody && (
        <Link href={`/h/${h.id}`} className="text-sm text-muted">
          <span className="line-clamp-3 whitespace-pre-wrap">{h.guideBody}</span>
          <span className="mt-1 block text-brand"><T k="media.hl.readGuide" /></span>
        </Link>
      )}
    </article>
  );
}
