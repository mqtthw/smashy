import { describe, expect, it } from "vitest";
import { sceneFromLook } from "@/lib/diVisuals";
import { DI_VICTIMS, STAGE_KEYS } from "@/lib/diSurvival";
import { killMoves, newKillQuestion, toKillView } from "@/lib/frameGames";
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

  it("can set up every move hitting every victim", () => {
    for (const m of killMoves())
      for (const v of DI_VICTIMS) {
        const scene = sceneFromLook(KILL_LOOKS[`${m.char}-${m.move}`], v, 0, 1, 45, 100, () => 0.5);
        expect(scene, `${m.char} ${m.move} on ${v}`).not.toBeNull();
        // The attacker stands close (a back hit puts them just past the victim; KillScene mirrors those).
        expect(Math.abs(scene!.ax)).toBeLessThan(40);
      }
  });

  it("gives every Melee question its stage", () => {
    let i = 0;
    const rand = () => ((i++ * 0.6180339) % 1);
    for (let n = 0; n < 20; n++) expect(STAGE_SHAPES[toKillView(newKillQuestion(rand)).stageKey!]).toBeDefined();
  });
});
