"use client";
// The Arcade page (round 948, Matthew: "Overhaul of this page"). It was a grid of five text cards; now it reads
// like a game-select screen: a hero that knows today's progress (puzzles solved, streak, the clock to the next
// ones) with one button to the next thing to play, the two daily puzzles as big picture cards, and the
// play-anytime games in a row under them. Each card's picture is a few plain shapes drawn here (no artwork
// from the games), in the game's own colour. This browser's record fills in the chips.
// Round 995 (Matthew: "Try harder to overhaul the visuals and cards"): the hero is an arcade marquee (a gold logo,
// a scoreboard; its chasing lights came out in round 996), the sections have numbered plates, and the cards have cut corners, coloured frames and
// halftone pictures; the daily puzzles carry a "Daily #N" plate and a stamp for today. The look is in
// arcadeHub.css.
import Link from "next/link";
import { NextPuzzle, Pips } from "@/components/arcade/ArcadeBits";
import { SETS_PER_ROUND, liveStreak, readStats } from "@/lib/arcade";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";
import { ART, GAME_LOOK, QUIZ_LOOK } from "./ArcadeArt";
import "./arcadeHub.css";

type Game = { href: string; title: MessageKey; line: MessageKey; color: string; art: React.ReactNode };
const MAJOR: Game = { href: "/arcade/major", title: "history.arcade.major.title", line: "history.arcade.major.line", color: "#ffd447", art: ART.major };
const PLAYER: Game = { href: "/arcade/player", title: "history.arcade.player.title", line: "history.arcade.player.line", color: "#ff6b5e", art: ART.player };
const HL: Game = { href: "/arcade/higher-lower", ...GAME_LOOK.hl };
const SETS: Game = { href: "/arcade/sets", ...GAME_LOOK.sets };
const DI: Game = { href: "/arcade/di", ...GAME_LOOK.di };
// Left to right (Matthew's order): Does it kill?, Guess the move, Which is faster?; then Which is safer on shield?
// (round 968) as a wide card across the next row (round 995), so the first three stay as he set them.
const QUIZZES: (Game & { best: string })[] = [
  { href: "/arcade/kill", ...QUIZ_LOOK.kill, best: "arcade.fq.kill.best" },
  { href: "/arcade/move", ...QUIZ_LOOK.move, best: "arcade.fq.move.best" },
  { href: "/arcade/frames", ...QUIZ_LOOK.frames, best: "arcade.fq.frames.best" },
  { href: "/arcade/shield", ...QUIZ_LOOK.shield, best: "arcade.fq.shield.best" },
];
const TECH: Game = { href: "/arcade/tech-chase", ...GAME_LOOK.tech };

/** A quiz's card: its best score out of ten is read here, one stored value per card. */
function QuizCard({ quiz, i, wide }: { quiz: (typeof QUIZZES)[number]; i: number; wide?: boolean }) {
  const t = useT();
  const [best] = useStoredState(quiz.best, "0");
  return <GameCard game={quiz} i={i} wide={wide} chip={Number(best) > 0 ? <>★ {t("history.arcade.sets.best", { n: Number(best), total: 10 })}</> : <span className="text-muted">{t("history.arcade.tile.fresh")}</span>} />;
}

type Stamp = "won" | "missed" | "waiting";

function GameCard({ game, chip, i, big = false, wide = false, badge, stamp }: { game: Game; chip: React.ReactNode; i: number; big?: boolean; wide?: boolean; badge?: string; stamp?: Stamp }) {
  const t = useT();
  return (
    <li className={`ah-pop ${wide ? "ah-wide" : ""}`} style={{ animationDelay: `${i * 60}ms`, "--tile": game.color } as React.CSSProperties}>
      <Link href={game.href} className={`ah-card ${big ? "ah-big" : ""}`}>
        <span className="ah-inner">
          <span className="ah-art">
            {game.art}
            {badge && <span className="ah-badge">{badge}</span>}
            {stamp && (
              <span aria-hidden="true" className={`ah-stamp ah-${stamp}`}>
                {stamp === "won" ? "✓" : stamp === "missed" ? "✗" : ""}
              </span>
            )}
          </span>
          <span className="ah-body">
            <span className="ah-title">{t(game.title)}</span>
            <span className="ah-line">{t(game.line)}</span>
            <span className="ah-foot">
              <span>{chip}</span>
              <span className="ah-play">
                {t("history.arcade.play")} <span aria-hidden="true">→</span>
              </span>
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/** A section: a numbered gold plate, its title and a line, then its cards. */
function Section({ n, id, title, className, children }: { n: number; id: string; title: MessageKey; className: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="ah-head">
        <span aria-hidden="true" className="ah-num">{String(n).padStart(2, "0")}</span>
        {t(title)}
      </h2>
      <ul className={className}>{children}</ul>
    </section>
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
  // Guess the player first, on the left (Matthew); the hero's button also goes to the first unsolved one in this order.
  const daily = [{ game: PLAYER, stats: readStats(playerStored) }, { game: MAJOR, stats: readStats(majorStored) }];
  type Stats = (typeof daily)[number]["stats"];
  const done = daily.filter((d) => d.stats.last === day);
  const streak = Math.max(...daily.map((d) => liveStreak(d.stats, day)));
  const next = daily.find((d) => d.stats.last !== day)?.game ?? HL;
  const dailyStamp = (stats: Stats): Stamp => (stats.last !== day ? "waiting" : stats.won ? "won" : "missed");
  const dailyChip = (stats: Stats) =>
    stats.last === day ? (stats.won ? <span className="text-success">✓ {t("history.arcade.tile.solved")}</span> : <span className="text-muted">✗ {t("history.arcade.tile.missed")}</span>) : <span style={{ color: "var(--tile)" }}>● {t("history.arcade.tile.waiting")}</span>;
  const bestChip = (n: number, text: string) => (n > 0 ? <>★ {text}</> : <span className="text-muted">{t("history.arcade.tile.fresh")}</span>);

  return (
    <div className="flex flex-col gap-7">
      <header className="ah-hero">
        <span aria-hidden="true" className="ah-floaters">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        <div className="ah-hero-main">
          <p className="ah-eyebrow">{t("history.arcade.card.tag")}</p>
          <p className="ah-logo">{t("history.arcade.title")}</p>
          <Link href={next.href} className="ah-start">
            <span aria-hidden="true" className="ah-blink">▶</span>
            {t(done.length < daily.length ? "history.arcade.hero.cta" : "history.arcade.hero.keep")}
          </Link>
        </div>
        <dl className="ah-board">
          <div>
            <dt>{t("history.arcade.hero.today")}</dt>
            <dd>
              <span>{done.length}/{daily.length}</span>
              <Pips results={done.map((d) => d.stats.won)} total={daily.length} />
            </dd>
          </div>
          <div>
            <dt>{t("history.arcade.hero.streak")}</dt>
            <dd>{streak > 0 ? `🔥 ${streak}` : "0"}</dd>
          </div>
          <div>
            <dt>{t("history.arcade.hero.next")}</dt>
            <dd>
              <NextPuzzle bare className="" />
            </dd>
          </div>
        </dl>
      </header>

      <Section n={1} id="arcade-daily" title="history.arcade.sec.daily" className="grid gap-3 sm:grid-cols-2">
        {daily.map((d, i) => (
          <GameCard key={d.game.href} game={d.game} big i={i} badge={`${t("history.arcade.daily")} #${day}`} stamp={dailyStamp(d.stats)} chip={dailyChip(d.stats)} />
        ))}
      </Section>

      <Section n={2} id="arcade-anytime" title="history.arcade.sec.anytime" className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <GameCard game={SETS} i={2} chip={bestChip(Number(setsBest), t("history.arcade.sets.best", { n: Number(setsBest), total: SETS_PER_ROUND }))} />
        <GameCard game={HL} i={3} chip={bestChip(Number(hlBest), t("history.arcade.hl.best", { n: Number(hlBest) }))} />
      </Section>

      <Section n={3} id="arcade-knowledge" title="history.arcade.sec.knowledge" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {QUIZZES.map((quiz, i) => (
          <QuizCard key={quiz.href} quiz={quiz} i={4 + i} wide={i === QUIZZES.length - 1} />
        ))}
      </Section>

      <Section n={4} id="arcade-trainers" title="history.arcade.sec.trainers" className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <GameCard game={DI} i={8} chip={bestChip(Number(diBest), t("history.arcade.hl.best", { n: Number(diBest) }))} />
        <GameCard game={TECH} i={9} chip={bestChip(Number(techBest), t("history.arcade.hl.best", { n: Number(techBest) }))} />
      </Section>
    </div>
  );
}
