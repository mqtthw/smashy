// MADE BY tools/melee-disc/build-techchase.mjs: don't edit by hand. Each opponent's tech and getup frames for
// the Arcade's tech-chase trainer, read from the game itself (NTSC 1.02). Frames are counted as players count
// them (1 = the state's first frame); `up` is lying on the back, `down` on the front; `forward` and `back`
// are the getup rolls; `hits` are the frames a getup attack hits on.
export type Win = { frames: number; intangible: [number, number] | null; hits?: [number, number][] };
export type Getups = { stand: Win; attack: Win; forward: Win; back: Win };
export type TechData = { tech: Win; techRoll: Win; bounce: { up: number; down: number }; up: Getups; down: Getups };

export const TECH_VICTIMS = ["fox","falco","marth","sheik","captain-falcon","peach","jigglypuff"] as const;
export type TechVictim = (typeof TECH_VICTIMS)[number];

export const TECH_DATA: Record<TechVictim, TechData> = {
  "fox": {
    tech: {frames: 26, intangible: [1, 20]},
    techRoll: {frames: 40, intangible: [1, 20]},
    bounce: {up: 26, down: 26},
    up: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 26], hits: [[17, 19], [24, 26]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [12, 29]}},
    down: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 26], hits: [[19, 20], [25, 26]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 24]}},
  },
  "falco": {
    tech: {frames: 26, intangible: [1, 20]},
    techRoll: {frames: 40, intangible: [1, 20]},
    bounce: {up: 26, down: 26},
    up: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 26], hits: [[17, 19], [24, 26]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [12, 29]}},
    down: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 26], hits: [[19, 20], [25, 26]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 24]}},
  },
  "marth": {
    tech: {frames: 26, intangible: [1, 20]},
    techRoll: {frames: 40, intangible: [1, 20]},
    bounce: {up: 26, down: 26},
    up: {stand: {frames: 29, intangible: [1, 21]}, attack: {frames: 49, intangible: [1, 31], hits: [[20, 23], [30, 31]]}, forward: {frames: 35, intangible: [6, 19]}, back: {frames: 35, intangible: [1, 19]}},
    down: {stand: {frames: 29, intangible: [1, 21]}, attack: {frames: 49, intangible: [1, 28], hits: [[22, 23], [27, 28]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 19]}},
  },
  "sheik": {
    tech: {frames: 26, intangible: [1, 20]},
    techRoll: {frames: 40, intangible: [1, 20]},
    bounce: {up: 26, down: 26},
    up: {stand: {frames: 29, intangible: [1, 19]}, attack: {frames: 49, intangible: [1, 26], hits: [[17, 19], [24, 26]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 22]}},
    down: {stand: {frames: 29, intangible: [1, 19]}, attack: {frames: 49, intangible: [1, 21], hits: [[16, 17], [20, 21]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 19]}},
  },
  "captain-falcon": {
    tech: {frames: 26, intangible: [1, 20]},
    techRoll: {frames: 40, intangible: [1, 20]},
    bounce: {up: 26, down: 26},
    up: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 29], hits: [[19, 20], [28, 29]]}, forward: {frames: 35, intangible: [1, 23]}, back: {frames: 35, intangible: [1, 19]}},
    down: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 27], hits: [[20, 21], [26, 27]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 25]}},
  },
  "peach": {
    tech: {frames: 26, intangible: [1, 20]},
    techRoll: {frames: 40, intangible: [1, 20]},
    bounce: {up: 26, down: 26},
    up: {stand: {frames: 29, intangible: [1, 19]}, attack: {frames: 49, intangible: [1, 27], hits: [[17, 19], [25, 27]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 19]}},
    down: {stand: {frames: 29, intangible: [1, 19]}, attack: {frames: 49, intangible: [1, 26], hits: [[17, 18], [25, 26]]}, forward: {frames: 35, intangible: [1, 19]}, back: {frames: 35, intangible: [1, 19]}},
  },
  "jigglypuff": {
    tech: {frames: 26, intangible: [1, 20]},
    techRoll: {frames: 40, intangible: [1, 20]},
    bounce: {up: 26, down: 26},
    up: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 15], hits: [[19, 20], [24, 25]]}, forward: {frames: 35, intangible: [1, 18]}, back: {frames: 35, intangible: [1, 20]}},
    down: {stand: {frames: 29, intangible: [1, 22]}, attack: {frames: 49, intangible: [1, 26], hits: [[20, 21], [24, 26]]}, forward: {frames: 35, intangible: [1, 23]}, back: {frames: 35, intangible: [1, 28]}},
  },
};
