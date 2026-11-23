import MainBadge from "@/components/MainBadge";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import FollowButton from "@/components/social/FollowButton";
import type { Suggestion } from "@/lib/discovery";
import { T } from "@/lib/i18n/client";

/** A small "Who to follow" card (same age group, city first). */
export default function WhoToFollow({ people }: { people: Suggestion[] }) {
  if (!people.length) return null;
  return (
    <section aria-labelledby="who-to-follow" className="border-b border-line px-4 py-3">
      <h2 id="who-to-follow" className="mb-2 text-sm font-bold"><T k="feed.whoToFollow" /></h2>
      <ul className="flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Link href={`/u/${p.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={p.tag} src={p.avatarUrl} size="sm" />
              <span className="min-w-0">
                <span className="flex items-center gap-1 truncate text-sm font-semibold">{p.tag} <MainBadge main={p.main} /></span>
                <span className="block truncate text-meta text-muted">@{p.handle} · {/* Spelled out, so the browser's trimmed phrases include both (round 749). */}{p.whyKey === "discover.alsoIn" ? <T k="discover.alsoIn" values={{ place: p.whyPlace ?? "" }} /> : <T k="discover.playsYourGames" />}</span>
              </span>
            </Link>
            <FollowButton profileId={p.id} state="none" isProtected={p.protected} signedIn />
          </li>
        ))}
      </ul>
    </section>
  );
}
