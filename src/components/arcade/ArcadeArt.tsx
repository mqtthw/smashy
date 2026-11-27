// The Arcade's pictures (moved here from ArcadeHub.tsx in round 971 so a quiz's own start screen can show its card's
// picture too): 200 x 110, a few plain shapes each, no artwork from the games. QUIZ_LOOK: each knowledge quiz's
// title, one-line pitch, colour and picture, shared by its hub card and its start screen. GAME_LOOK (round 972): the
// same for the other play-anytime games, whose pages open with ArcadeBanner.
import type { MessageKey } from "@/lib/i18n/base";
import { T } from "@/lib/i18n/client";

const ink = "#12102e";

// The pictures: 200 x 110, plain shapes only.
export const ART = {
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
  // Which is safer on shield? (round 968): a shield bubble taking a hit, and a frame count under it.
  shield: (
    <svg viewBox="0 0 200 110" aria-hidden="true">
      <circle cx={70} cy={52} r={34} fill="rgb(255 255 255 / 0.35)" stroke="#fff" strokeWidth={4} />
      <path d="M150 52h-38m0 0 12-10m-12 10 12 10" fill="none" stroke={ink} strokeWidth={6} />
      <text x={128} y={30} fontSize="26" fontWeight="900" fontStyle="italic" fill={ink}>-12</text>
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

export type QuizLook = { title: MessageKey; line: MessageKey; color: string; art: React.ReactNode };
export const QUIZ_LOOK: Record<"frames" | "move" | "kill" | "shield", QuizLook> = {
  kill: { title: "history.arcade.fq.kill.title", line: "history.arcade.fq.kill.line", color: "#9dff6a", art: ART.kill },
  move: { title: "history.arcade.fq.move.title", line: "history.arcade.fq.move.line", color: "#ff9ad5", art: ART.move },
  frames: { title: "history.arcade.fq.frames.title", line: "history.arcade.fq.frames.line", color: "#6aa7ff", art: ART.frames },
  shield: { title: "history.arcade.fq.shield.title", line: "history.arcade.fq.shield.line", color: "#4fe3c1", art: ART.shield },
};

export const GAME_LOOK: Record<"hl" | "sets" | "tech" | "di", QuizLook> = {
  hl: { title: "history.arcade.hl.title", line: "history.arcade.hl.line", color: "#5ad1ff", art: ART.hl },
  sets: { title: "history.arcade.sets.title", line: "history.arcade.sets.line", color: "#7dff9a", art: ART.sets },
  tech: { title: "history.arcade.tech.title", line: "history.arcade.tech.line", color: "#ffa040", art: ART.tech },
  di: { title: "history.arcade.di.title", line: "history.arcade.di.line", color: "#c58bff", art: ART.di },
};

/** A game page's title (round 972): its card's picture and colour in a band, the title and one line over it. */
export function ArcadeBanner({ look }: { look: QuizLook }) {
  return (
    <header className="arcade-banner" style={{ "--tile": look.color } as React.CSSProperties}>
      <span className="arcade-banner-art">{look.art}</span>
      <h1 className="arcade-banner-title"><T k={look.title} /></h1>
      <p className="arcade-banner-line"><T k={look.line} /></p>
    </header>
  );
}
