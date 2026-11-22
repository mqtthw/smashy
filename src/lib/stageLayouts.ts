// Simple platform-layout diagrams for quick stage recognition (drawn for Smashy: the main stage's shape
// and where the platforms are, not the games' art). Coordinates are in a 100 x 56 box. Only stages
// whose layout we're sure of are drawn; anything else shows its name on a plain tile.
// Shared by server and browser code.

export type StageLayout = {
  main: string; // SVG polygon points for the main stage
  platforms: { x1: number; x2: number; y: number; moves?: boolean }[]; // moves = drawn dashed
  note?: string; // a short hint, e.g. "platforms move"
};

const BF = "14,38 86,38 80,44 68,48 60,52 40,52 32,48 20,44";
const FLAT_LONG = "10,38 90,38 80,48 20,48";
const STORY = "12,41 18,38 82,38 88,41 84,46 16,46";
const WIDE = "6,38 94,38 88,46 12,46";
const THIN = "10,40 90,40 88,46 12,46";
const TILTED = "10,40 90,36 86,44 14,48";
const DIP = "8,36 30,40 70,40 92,36 86,46 14,46";

const LAYOUTS: Record<string, StageLayout> = {
  battlefield: { main: BF, platforms: [{ x1: 20, x2: 40, y: 27 }, { x1: 60, x2: 80, y: 27 }, { x1: 40, x2: 60, y: 16 }] },
  "small battlefield": { main: BF, platforms: [{ x1: 20, x2: 40, y: 27 }, { x1: 60, x2: 80, y: 27 }] },
  "final destination": { main: FLAT_LONG, platforms: [] },
  "yoshis story": { main: STORY, platforms: [{ x1: 18, x2: 36, y: 28 }, { x1: 64, x2: 82, y: 28 }, { x1: 41, x2: 59, y: 18 }] },
  "fountain of dreams": {
    main: BF,
    platforms: [{ x1: 20, x2: 38, y: 28, moves: true }, { x1: 62, x2: 80, y: 28, moves: true }, { x1: 40, x2: 60, y: 17 }],
    note: "side platforms move",
  },
  "pokemon stadium": { main: WIDE, platforms: [{ x1: 18, x2: 38, y: 28 }, { x1: 62, x2: 82, y: 28 }], note: "transforms" },
  "pokemon stadium 2": { main: WIDE, platforms: [{ x1: 18, x2: 38, y: 28 }, { x1: 62, x2: 82, y: 28 }], note: "transforms" },
  "dream land": { main: WIDE, platforms: [{ x1: 16, x2: 34, y: 26 }, { x1: 66, x2: 84, y: 26 }, { x1: 41, x2: 59, y: 13 }] },
  smashville: { main: THIN, platforms: [{ x1: 38, x2: 62, y: 26, moves: true }], note: "platform moves" },
  "town and city": {
    main: THIN,
    platforms: [{ x1: 16, x2: 34, y: 28 }, { x1: 66, x2: 84, y: 28 }, { x1: 40, x2: 60, y: 18, moves: true }],
    note: "top platform comes and goes",
  },
  "kalos pokemon league": { main: THIN, platforms: [{ x1: 18, x2: 36, y: 28 }, { x1: 64, x2: 82, y: 28 }] },
  "lylat cruise": { main: TILTED, platforms: [{ x1: 18, x2: 34, y: 29 }, { x1: 66, x2: 82, y: 26 }, { x1: 42, x2: 58, y: 17 }], note: "tilts" },
  "hollow bastion": { main: THIN, platforms: [{ x1: 38, x2: 62, y: 26 }] },
  "yoshis island brawl": { main: DIP, platforms: [{ x1: 40, x2: 60, y: 24, moves: true }], note: "middle platform tilts" },
};

const ALIASES: Record<string, string> = {
  bf: "battlefield",
  fd: "final destination",
  "omega final destination": "final destination",
  ys: "yoshis story",
  fod: "fountain of dreams",
  ps: "pokemon stadium",
  ps2: "pokemon stadium 2",
  "dream land n64": "dream land",
  "dream land 64": "dream land",
  "dreamland 64": "dream land",
  dreamland: "dream land",
  dl: "dream land",
  sv: "smashville",
  "town & city": "town and city",
  "t&c": "town and city",
  kalos: "kalos pokemon league",
  lylat: "lylat cruise",
  "yoshis island (brawl)": "yoshis island brawl",
};

/** "Pokémon Stadium 2" -> "pokemon stadium 2"; "Yoshi's Island (Brawl)" -> "yoshis island brawl". */
export function stageKey(name: string): string {
  const base = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "").trim();
  if (ALIASES[base]) return ALIASES[base];
  const plain = base.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  return ALIASES[plain] ?? plain;
}

export function stageLayout(name: string): StageLayout | null {
  return LAYOUTS[stageKey(name)] ?? null;
}

/** Up to 2 letters for a stage without a drawing ("Castle Siege" -> "CS"). */
export function stageInitials(name: string): string {
  const words = name.replace(/[()'’.,]/g, "").split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(of|the|and)$/i.test(w));
  return (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
