// Who won this set?: ten saved finals sets from majors, picked afresh at each visit. Sets with a player who
// hides their stats are left out, and when that can't be checked no sets are shown.
import type { Metadata } from "next";
import Link from "next/link";
import { ArcadeBanner, GAME_LOOK } from "@/components/arcade/ArcadeArt";
import { connection } from "next/server";
import { Suspense } from "react";
import GameChips from "@/components/arcade/GameChips";
import WhoWon from "@/components/arcade/WhoWon";
import { isGameKey } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { SETS_PER_ROUND, coin, pickSome, yearOf, type ArcadeSet } from "@/lib/arcade";
import { arcadeMajors } from "@/lib/arcadeData";
import { T } from "@/lib/i18n/client";
import { localRound } from "@/lib/i18n/rounds";
import { getT } from "@/lib/i18n/server";
import { stockIconUrl } from "@/lib/mainBadge";
import { finalsSets, mostPlayed, startggCharacterKey, tagOnly } from "@/lib/majorSets";
import { playersHidingStats } from "@/lib/playerStats";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.sets.title"), description: "Real grand finals, winners finals and losers finals from Super Smash Bros. majors: pick who won, ten sets a round." };
}

async function Round({ searchParams }: { searchParams: PageProps<"/arcade/sets">["searchParams"] }) {
  const sp = await searchParams;
  const game = isGameKey(sp.game) ? sp.game : null;
  await connection(); // different sets each visit
  const [t, sets, majors] = await Promise.all([getT(), finalsSets().catch(() => null), arcadeMajors().catch(() => null)]);
  const byMajor = new Map((majors ?? []).map((m) => [`${m.slug}|${m.game}`, m]));
  const some = pickSome((sets ?? []).filter((s) => (!game || s.game === game) && byMajor.has(`${s.major_slug}|${s.game}`)), SETS_PER_ROUND + 6, Math.random);
  const hidden = some.length ? await playersHidingStats(some.flatMap((s) => [s.p1_id, s.p2_id]).filter((id): id is string => !!id)).catch(() => null) : null;
  const shown: ArcadeSet[] = (hidden ? some : [])
    .filter((s) => !(s.p1_id && hidden!.has(s.p1_id)) && !(s.p2_id && hidden!.has(s.p2_id)))
    .slice(0, SETS_PER_ROUND)
    .map((s) => {
      const major = byMajor.get(`${s.major_slug}|${s.game}`)!;
      const sideOf = (name: string, chars: string[] | null, score: number | null) => {
        const characters = mostPlayed(chars ?? []).slice(0, 2);
        const icons = characters.flatMap((c) => stockIconUrl({ game: s.game, character: startggCharacterKey(c) }) ?? []);
        return { name: tagOnly(name), characters, icons, score: score ?? 0 };
      };
      const p1 = sideOf(s.p1_name, s.p1_chars, s.p1_score);
      const p2 = sideOf(s.p2_name, s.p2_chars, s.p2_score);
      const flip = coin(Math.random); // which side comes first says nothing about who won
      return { id: s.set_id, major: major.name, href: majorHref(s.major_slug), year: yearOf(major.date), game: s.game, round: localRound(s.round ?? "", t), a: flip ? p2 : p1, b: flip ? p1 : p2, winner: (s.winner === 1) === !flip ? "a" : "b" };
    });
  return (
    <>
      <GameChips base="/arcade/sets" game={game} />
      {shown.length ? <WhoWon sets={shown} /> : <p className="card p-4 text-sm text-muted"><T k="history.arcade.unavailable" /></p>}
    </>
  );
}

export default function WhoWonPage(props: PageProps<"/arcade/sets">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <ArcadeBanner look={GAME_LOOK.sets} />
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Round searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
