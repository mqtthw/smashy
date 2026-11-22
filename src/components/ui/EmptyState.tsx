// "Nothing here yet" (round 499): a glass panel with three characters in glossy bubbles, one bold
// line, an optional short line and one button, instead of a grey sentence in a box. The characters
// follow the game being shown, so an empty Melee board shows Melee characters. Safe on the server.
import type { Main } from "@/lib/characters";
import type { GameKey } from "@/lib/games";
import { stockIconUrl } from "@/lib/mainBadge";

/** Three characters per game (any game without its own trio gets the mixed one). */
const CAST: Partial<Record<GameKey | "all", Main[]>> = {
  all: [
    { game: "melee", character: "fox" },
    { game: "ultimate", character: "pikachu" },
    { game: "melee", character: "marth" },
  ],
  melee: [
    { game: "melee", character: "falco" },
    { game: "melee", character: "fox" },
    { game: "melee", character: "sheik" },
  ],
  ultimate: [
    { game: "ultimate", character: "steve" },
    { game: "ultimate", character: "pikachu" },
    { game: "ultimate", character: "sonic" },
  ],
  pplus: [
    { game: "pplus", character: "lucas" },
    { game: "pplus", character: "snake" },
    { game: "pplus", character: "wolf" },
  ],
};

export function emptyCast(game: string | null | undefined): Main[] {
  return CAST[(game ?? "all") as GameKey | "all"] ?? CAST.all!;
}

export default function EmptyState({ game, title, body, action }: { game?: string | null; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode }) {
  const icons = emptyCast(game)
    .map((m) => stockIconUrl(m))
    .filter((src): src is string => !!src);
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-8 text-center">
      {icons.length > 0 && (
        <div className="flex items-end" aria-hidden="true">
          {icons.map((src, i) => (
            <span key={src} className={`portrait-bubble ${i === 1 ? "z-[1] -mx-2 h-20 w-20" : "h-14 w-14"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" width={i === 1 ? 52 : 36} height={i === 1 ? 52 : 36} className={i === 1 ? "h-[52px] w-[52px]" : "h-9 w-9"} />
            </span>
          ))}
        </div>
      )}
      <p className="text-title font-bold">{title}</p>
      {body && <p className="max-w-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}
