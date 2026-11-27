import { describe, expect, it } from "vitest";
import { HURTBOXES, type Hurtbox } from "@/lib/diVisuals.data";
import { firstContact, segDistance } from "@/lib/killSetup";
import { KILL_HITS, KILL_SETUPS } from "@/lib/killSetups.data";
import { MELEE_MOVES } from "@/lib/meleeMoves.data";
import { DI_VICTIMS, STAGE_KEYS } from "@/lib/diSurvival";
import { killHitOf, killMoves, newKillQuestion, toKillView } from "@/lib/frameGames";
import { KILL_LOOKS, STAGE_SHAPES } from "@/lib/killVisuals.data";

// Does it kill?'s Melee pictures (round 1001): made from the game by tools/melee-disc/build-kill.mjs.
describe("Does it kill?'s Melee pictures", () => {
  it("has the game's look for every move it asks about, and every stage's shape", () => {
    for (const m of killMoves()) {
      const look = KILL_LOOKS[`${m.char}-${m.move}`];
      expect(look, `${m.char} ${m.move}`).toBeDefined();
      expect(look.boxes.length).toBeGreaterThan(0);
      // The kill hitbox comes out within the move's own frames (the move data's hits).
      expect(look.hit).toBeGreaterThanOrEqual(m.data.start);
      expect(look.hit).toBeLessThanOrEqual(m.data.end);
    }
    for (const k of STAGE_KEYS) {
      expect(STAGE_SHAPES[k].body.length, k).toBeGreaterThanOrEqual(8);
      // The stage's top is at 0 and its edges are where the blast-line maths says the stage ends.
      expect(Math.max(...STAGE_SHAPES[k].body.map(([, y]) => y))).toBeLessThan(1);
    }
    // Battlefield's three platforms, as in the game.
    expect(STAGE_SHAPES.battlefield.platforms.map((p) => p[0][1])).toEqual([34, 68, 34]);
  });

  it("has a setup for every move on every victim where its kill hit is the hitbox that lands (round 1005)", () => {
    for (const m of killMoves())
      for (const v of DI_VICTIMS) {
        const key = `${m.char}-${m.move}`;
        const row = KILL_SETUPS[`${key}|${v}`];
        expect(row, `${key} on ${v}`).toBeDefined();
        const [ax, ay, face, frame, vy] = row;
        // The attacker starts on the victim's left; checked again the game's way from there.
        expect(ax).toBeLessThan(0);
        const hurt = HURTBOXES[v].map(([x1, y1, x2, y2, r, h]) => [-x1, y1 + vy, -x2, y2 + vy, r, h] as Hurtbox);
        expect(firstContact(KILL_LOOKS[key], hurt, ax, ay, face), `${key} on ${v}`).toEqual({ frame, kill: true });
      }
  });

  it("spaces Marth's forward smash so the tipper is what lands, and closer in it isn't", () => {
    const look = KILL_LOOKS["marth-fsmash"];
    const [ax, ay, face, frame] = KILL_SETUPS["marth-fsmash|fox"];
    expect(ax).toBeLessThanOrEqual(-28); // a tipper is the blade's very end
    const hurt = HURTBOXES.fox.map(([x1, y1, x2, y2, r, h]) => [-x1, y1, -x2, y2, r, h] as Hurtbox);
    expect(firstContact(look, hurt, ax, ay, face)).toEqual({ frame, kill: true });
    // Ten units closer, the blade's lower-numbered hitboxes touch first: not a tipper.
    expect(firstContact(look, hurt, ax + 10, ay, face)?.kill).toBe(false);
    // The tipper is out at the tip: further forward than any other hitbox of the move on the frame it lands.
    const boxes = look.all.find(([f]) => f === frame)![2];
    const tip = boxes.find((b) => b[4] === 1)!;
    expect(boxes.every((b) => b === tip || b[1] < tip[1])).toBe(true);
  });

  it("uses the hit that really lands when a move's strongest never can", () => {
    // Jigglypuff's up smash: its 15% box is inside the 14% one, which the game checks first.
    expect(KILL_HITS["jigglypuff-usmash"]).toMatchObject({ damage: 14 });
    expect(killHitOf({ char: "jigglypuff", move: "usmash", data: MELEE_MOVES.jigglypuff.usmash! }).damage).toBe(14);
  });

  it("finds whether a swept hitbox touches a capsule", () => {
    expect(segDistance([0, 0, 10, 0], [5, -3, 5, 3])).toBe(0);
    expect(segDistance([0, 0, 10, 0], [5, 2, 5, 3])).toBeCloseTo(2);
    expect(segDistance([0, 0, 0, 0], [3, 4, 3, 4])).toBeCloseTo(5);
  });

  it("gives every Melee question its stage", () => {
    let i = 0;
    const rand = () => ((i++ * 0.6180339) % 1);
    for (let n = 0; n < 20; n++) expect(STAGE_SHAPES[toKillView(newKillQuestion(rand)).stageKey!]).toBeDefined();
  });
});
