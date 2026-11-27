// The Arcade's card on the home page (round 943, Matthew: "Home page card"): one quiet row above the posts
// that leads to the day's puzzles. No data of its own, so it costs the Feed nothing. Wide screens show it in the
// right-hand column instead (round 944, SideColumn.tsx), so this one is hidden there.
import Link from "next/link";
import { T } from "@/lib/i18n/client";

export default function ArcadeCard() {
  return (
    <Link href="/arcade" className="card m-3 flex items-center xl:hidden justify-between gap-3 p-4 hover:bg-surface">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-bold"><T k="history.arcade.card.title" /></span>
        <span className="text-sm text-muted"><T k="history.arcade.card.text" /></span>
      </span>
      <span className="btn btn-sm btn-outline shrink-0"><T k="history.arcade.card.play" /> →</span>
    </Link>
  );
}
