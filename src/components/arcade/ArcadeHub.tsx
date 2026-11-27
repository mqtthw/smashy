"use client";
// The Arcade page (round 948, Matthew: "Overhaul of this page"). It was a grid of five text cards; now it reads
// like a game-select screen: a hero that knows today's progress (puzzles solved, streak, the clock to the next
// ones) with one button to the next thing to play, the two daily puzzles as big picture cards, and the
// play-anytime games in a row under them. Each card's picture is a few plain shapes drawn here (no artwork
// from the games), in the game's own colour. This browser's record fills in the chips.
import Link from "next/link";
import { NextPuzzle, Pips } from "@/components/arcade/ArcadeBits";
import { SETS_PER_ROUND, liveStreak, readStats } from "@/lib/arcade";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";
import { ART, GAME_LOOK, QUIZ_LOOK } from "./ArcadeArt";

type Game = { href: string; title: MessageKey; line: MessageKey; color: string; art: React.ReactNode };
const MAJOR: Game = { href: "/arcade/major", title: "history.arcade.major.title", line: "history.arcade.major.line", color: "#ffd447", art: ART.major };
const PLAYER: Game = { href: "/arcade/player", title: "history.arcade.player.title", line: "history.arcade.player.line", color: "#ff6b5e", art: ART.player };
const HL: Game = { href: "/arcade/higher-lower", ...GAME_LOOK.hl };
const SETS: Game = { href: "/arcade/sets", ...GAME_LOOK.sets };
const DI: Game = { href: "/arcade/di", ...GAME_LOOK.di };
// Left to right (Matthew's order): Does it kill?, Guess the move, Which is faster?; then Which is safer on shield?
// (round 968) starting the next row, so the first three stay as he set them.
const QUIZZES: (Game & { best: string })[] = [
  { href: "/arcade/kill", ...QUIZ_LOOK.kill, best: "arcade.fq.kill.best" },
  { href: "/arcade/move", ...QUIZ_LOOK.move, best: "arcade.fq.move.best" },
  { href: "/arcade/frames", ...QUIZ_LOOK.frames, best: "arcade.fq.frames.best" },
  { href: "/arcade/shield", ...QUIZ_LOOK.shield, best: "arcade.fq.shield.best" },
];
const TECH: Game = { href: "/arcade/tech-chase", ...GAME_LOOK.tech };

/** A quiz's card: its best score out of ten is read here, one stored value per card. */
function QuizCard({ quiz, i }: { quiz: (typeof QUIZZES)[number]; i: number }) {
  const t = useT();
  const [best] = useStoredState(quiz.best, "0");
  return <GameCard game={quiz} i={i} chip={Number(best) > 0 ? <>★ {t("history.arcade.sets.best", { n: Number(best), total: 10 })}</> : <span className="text-muted">{t("history.arcade.tile.fresh")}</span>} />;
}

function GameCard({ game, chip, big = false, i }: { game: Game; chip: React.ReactNode; big?: boolean; i: number }) {
  const t = useT();
  return (
    <li className="arcade-pop" style={{ animationDelay: `${i * 70}ms` }}>
      <Link href={game.href} className={`arcade-game ${big ? "arcade-game-big" : ""}`} style={{ "--tile": game.color } as React.CSSProperties}>
        <span className="arcade-game-art">{game.art}</span>
        <span className="flex flex-1 flex-col gap-1.5 p-4">
          <span className="arcade-game-title">{t(game.title)}</span>
          <span className="text-sm text-muted">{t(game.line)}</span>
          <span className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="text-sm font-semibold">{chip}</span>
            <span className="arcade-game-play">{t("history.arcade.play")} →</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function ArcadeHub({ day }: { day: number }) {
  const t = useT();
  const [majorStored] = useStoredState("arcade.major.stats", "");
  const [playerStored] = useStoredState("arcade.player.stats", "");
  const [hlBest] = useStoredState("arcade.hl.best", "0");
  const [setsBest] = useStoredState("arcade.sets.best", "0");
  const [techBest] = useStoredState("arcade.tech.best", "0");
  const [diBest] = useStoredState("arcade.di.best", "0");
  const daily = [{ game: MAJOR, stats: readStats(majorStored) }, { game: PLAYER, stats: readStats(playerStored) }];
  const done = daily.filter((d) => d.stats.last === day);
  const streak = Math.max(...daily.map((d) => liveStreak(d.stats, day)));
  const next = daily.find((d) => d.stats.last !== day)?.game ?? HL;
  const dailyChip = (stats: (typeof daily)[number]["stats"]) =>
    stats.last === day ? (stats.won ? <span className="text-success">✓ {t("history.arcade.tile.solved")}</span> : <span className="text-muted">✗ {t("history.arcade.tile.missed")}</span>) : <span style={{ color: "var(--tile)" }}>● {t("history.arcade.tile.waiting")}</span>;
  const bestChip = (n: number, text: string) => (n > 0 ? <>★ {text}</> : <span className="text-muted">{t("history.arcade.tile.fresh")}</span>);

  return (
    <div className="flex flex-col gap-6">
      <div className="arcade-hero">
        <div className="flex flex-col gap-2">
          <p className="arcade-promo-title">{t("history.arcade.title")}</p>
          <p className="text-base font-bold">{t("history.arcade.card.tag")}</p>
          <p className="max-w-md text-sm opacity-90">{t("history.arcade.intro")}</p>
          <Link href={next.href} className="arcade-promo-btn mt-2 self-start">{t(done.length < daily.length ? "history.arcade.hero.cta" : "history.arcade.hero.keep")} →</Link>
        </div>
        <dl className="arcade-hero-stats">
          <div>
            <dt>{t("history.arcade.hero.today")}</dt>
            <dd className="flex items-center gap-2">
              <span className="tabular-nums">{done.length}/{daily.length}</span>
              <Pips results={daily.filter((d) => d.stats.last === day).map((d) => d.stats.won)} total={daily.length} />
            </dd>
          </div>
          <div>
            <dt>{t("history.arcade.hero.streak")}</dt>
            <dd className="tabular-nums">{streak > 0 ? `🔥 ${streak}` : "0"}</dd>
          </div>
          <div>
            <dt>{t("history.arcade.hero.next")}</dt>
            <dd><NextPuzzle bare className="tabular-nums" /></dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby="arcade-daily" className="flex flex-col gap-3">
        <h2 id="arcade-daily" className="font-bold">{t("history.arcade.sec.daily")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {daily.map((d, i) => <GameCard key={d.game.href} game={d.game} big i={i} chip={dailyChip(d.stats)} />)}
        </ul>
      </section>

      <section aria-labelledby="arcade-anytime" className="flex flex-col gap-3">
        <h2 id="arcade-anytime" className="font-bold">{t("history.arcade.sec.anytime")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <GameCard game={SETS} i={2} chip={bestChip(Number(setsBest), t("history.arcade.sets.best", { n: Number(setsBest), total: SETS_PER_ROUND }))} />
          <GameCard game={HL} i={3} chip={bestChip(Number(hlBest), t("history.arcade.hl.best", { n: Number(hlBest) }))} />
        </ul>
      </section>

      <section aria-labelledby="arcade-knowledge" className="flex flex-col gap-3">
        <h2 id="arcade-knowledge" className="font-bold">{t("history.arcade.sec.knowledge")}</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {QUIZZES.map((quiz, i) => <QuizCard key={quiz.href} quiz={quiz} i={4 + i} />)}
        </ul>
      </section>

      <section aria-labelledby="arcade-trainers" className="flex flex-col gap-3">
        <h2 id="arcade-trainers" className="font-bold">{t("history.arcade.sec.trainers")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <GameCard game={DI} i={4} chip={bestChip(Number(diBest), t("history.arcade.hl.best", { n: Number(diBest) }))} />
          <GameCard game={TECH} i={5} chip={bestChip(Number(techBest), t("history.arcade.hl.best", { n: Number(techBest) }))} />
        </ul>
      </section>
    </div>
  );
}
