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

type Game = { href: string; title: MessageKey; line: MessageKey; color: string; art: React.ReactNode };
const ink = "#12102e";

// The pictures: 200 x 110, plain shapes only.
const ART = {
  major: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      {/* Each bar is slanted in its own place (a skew on the whole group slid the lower bars into the numbers). */}
      {[0, 1, 2, 3].map((i) => {
        const y = 17 + i * 21;
        const w = 88 - i * 14;
        return <path key={i} d={`M40 ${y}h${w}l-3 14h-${w}z`} fill={ink} opacity={0.85 - i * 0.14} />;
      })}
      {[1, 2, 3, 4].map((n, i) => <text key={n} x={30} y={29 + i * 21} fontSize="13" fontWeight="900" fontStyle="italic" textAnchor="end" fill={ink}>{n}</text>)}
      <rect x={138} y={32} width={48} height={42} fill="#fff" transform="rotate(8 162 53)" />
      <text x={162} y={64} fontSize="30" fontWeight="900" fontStyle="italic" textAnchor="middle" fill={ink} transform="rotate(8 162 53)">?</text>
    </svg>
  ),
  player: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      <circle cx={100} cy={38} r={22} fill={ink} />
      <path d="M58 110c0-30 18-44 42-44s42 14 42 44z" fill={ink} />
      <text x={100} y={49} fontSize="30" fontWeight="900" fontStyle="italic" textAnchor="middle" fill="#fff">?</text>
      {[0, 1, 2].map((i) => <rect key={i} x={150} y={22 + i * 20} width={34} height={11} fill="#fff" opacity={0.9 - i * 0.25} transform="skewX(-12)" />)}
    </svg>
  ),
  hl: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      <rect x={42} y={52} width={44} height={58} fill={ink} />
      <rect x={114} y={20} width={44} height={90} fill={ink} />
      <path d="M64 40l-12 0 12-16 12 16z" fill="#fff" transform="rotate(180 64 32)" />
      <path d="M136 14l-12 0 12-16 12 16z" fill="#fff" transform="translate(0 4)" />
    </svg>
  ),
  sets: (
    <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" className="!w-full" aria-hidden="true">
      <path d="M0 0h104l-24 110H0z" fill={ink} opacity={0.9} />
      <path d="M200 0h-84l-24 110h108z" fill="#fff" opacity={0.85} />
      <text x={100} y={68} fontSize="34" fontWeight="900" fontStyle="italic" textAnchor="middle" fill="#ffd447" stroke={ink} strokeWidth={2} paintOrder="stroke">VS</text>
    </svg>
  ),
  tech: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      <rect x={14} y={86} width={172} height={6} fill={ink} />
      <path d="M52 86l4-34h20l6 34z" fill={ink} />
      <circle cx={68} cy={42} r={10} fill={ink} />
      <rect x={76} y={58} width={26} height={7} fill={ink} />
      <circle cx={140} cy={70} r={16} fill="#fff" />
      <path d="M118 50a26 26 0 0 1 36-6" fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="6 5" />
    </svg>
  ),
  di: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      <rect x={60} y={90} width={80} height={6} fill={ink} />
      <path d="M100 86C112 40 150 22 190 18" fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="6 5" />
      <path d="M100 86C96 44 116 14 150 4" fill="none" stroke={ink} strokeWidth={5} />
      <circle cx={100} cy={82} r={9} fill={ink} />
      <path d="M70 60h-24m0 0 9-8m-9 8 9 8" fill="none" stroke={ink} strokeWidth={5} />
    </svg>
  ),
  frames: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <rect key={i} x={22 + i * 13} y={22} width={10} height={24} fill={i < 3 ? "#fff" : ink} opacity={i < 3 ? 0.9 : 0.85} />)}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <rect key={i} x={22 + i * 13} y={64} width={10} height={24} fill={i < 7 ? "#fff" : ink} opacity={i < 7 ? 0.9 : 0.85} />)}
    </svg>
  ),
  move: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => <rect key={i} x={12 + i * 13} y={i >= 4 && i <= 6 ? 30 : 40} width={10} height={i >= 4 && i <= 6 ? 50 : 30} fill={i >= 4 && i <= 6 ? "#fff" : ink} opacity={0.9} />)}
      <text x={170} y={30} fontSize="28" fontWeight="900" fontStyle="italic" fill={ink}>?</text>
    </svg>
  ),
  kill: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      <rect x={10} y={8} width={180} height={94} fill="none" stroke={ink} strokeWidth={3} strokeDasharray="8 6" />
      <rect x={70} y={78} width={60} height={5} fill={ink} />
      <path d="M100 76C108 46 132 22 176 12" fill="none" stroke={ink} strokeWidth={5} />
      <circle cx={100} cy={72} r={7} fill={ink} />
      <text x={150} y={70} fontSize="30" fontWeight="900" fontStyle="italic" fill="#fff">?</text>
    </svg>
  ),
};

const MAJOR: Game = { href: "/arcade/major", title: "history.arcade.major.title", line: "history.arcade.major.line", color: "#ffd447", art: ART.major };
const PLAYER: Game = { href: "/arcade/player", title: "history.arcade.player.title", line: "history.arcade.player.line", color: "#ff6b5e", art: ART.player };
const HL: Game = { href: "/arcade/higher-lower", title: "history.arcade.hl.title", line: "history.arcade.hl.line", color: "#5ad1ff", art: ART.hl };
const SETS: Game = { href: "/arcade/sets", title: "history.arcade.sets.title", line: "history.arcade.sets.line", color: "#7dff9a", art: ART.sets };
const DI: Game = { href: "/arcade/di", title: "history.arcade.di.title", line: "history.arcade.di.line", color: "#c58bff", art: ART.di };
// Left to right (Matthew's order): Does it kill?, Guess the move, Which is faster?
const QUIZZES: (Game & { best: string })[] = [
  { href: "/arcade/kill", title: "history.arcade.fq.kill.title", line: "history.arcade.fq.kill.line", color: "#9dff6a", art: ART.kill, best: "arcade.fq.kill.best" },
  { href: "/arcade/move", title: "history.arcade.fq.move.title", line: "history.arcade.fq.move.line", color: "#ff9ad5", art: ART.move, best: "arcade.fq.move.best" },
  { href: "/arcade/frames", title: "history.arcade.fq.frames.title", line: "history.arcade.fq.frames.line", color: "#6aa7ff", art: ART.frames, best: "arcade.fq.frames.best" },
];
const TECH: Game = { href: "/arcade/tech-chase", title: "history.arcade.tech.title", line: "history.arcade.tech.line", color: "#ffa040", art: ART.tech };

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
