// Guess the player: the Arcade's second daily puzzle. The games take turns by day; the answer and the choices
// come from that game's major top 8s. Players who hide their stats are left out at every visit, and when that
// can't be checked the puzzle isn't shown.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import GuessPlayer from "@/components/arcade/GuessPlayer";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { dayNumber, pickDaily, playerGameOfDay, playerPuzzlePool, type PlayerOption } from "@/lib/arcade";
import { characterName } from "@/lib/characters";
import { unixNow } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { arcadePlayers, nameHref } from "@/lib/historyFirsts";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { stockIconUrl } from "@/lib/mainBadge";
import { playersHidingStats } from "@/lib/playerStats";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.player.title"), description: "A daily Super Smash Bros. puzzle: guess the mystery player from their major wins, top 8s and most-played character." };
}

const MAX_CHOICES = 250; // the players with the most top 8s

async function Puzzle() {
  await connection(); // today's puzzle
  const day = dayNumber(unixNow() * 1000);
  const game = playerGameOfDay(day);
  const rows = ((await arcadePlayers(game).catch(() => null)) ?? []).slice(0, MAX_CHOICES);
  const hidden = rows.length ? await playersHidingStats(rows.flatMap((p) => (p.playerId ? [p.playerId] : []))).catch(() => null) : null;
  const options: PlayerOption[] = hidden
    ? rows
        .filter((p) => (!p.playerId || !hidden.has(p.playerId)) && !/^deleted user$/i.test(p.name))
        .map((p) => {
          const mainName = p.main ? characterName(game, p.main) : null;
          return { slug: p.key, name: p.name, wins: p.wins, top8s: p.top8s, firstYear: p.firstYear, lastYear: p.lastYear, main: mainName ? p.main : null, mainName, mainIcon: mainName && p.main ? stockIconUrl({ game, character: p.main }) : null };
        })
    : [];
  const answer = pickDaily(playerPuzzlePool(options), day, 1);
  if (!answer) return <p className="card p-4 text-sm text-muted"><T k="history.arcade.unavailable" /></p>;
  const answerHref = /^\d+$/.test(answer.slug) ? `/players/${answer.slug}` : nameHref(answer.name);
  return <GuessPlayer day={day} gameLabel={GAMES[game].short} answer={answer} answerHref={answerHref} options={[...options].sort((a, b) => a.name.localeCompare(b.name))} />;
}

export default function GuessPlayerPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.player.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.player.blurb" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Puzzle />
      </Suspense>
    </section>
  );
}
