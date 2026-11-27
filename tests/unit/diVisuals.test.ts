import { describe, expect, it } from "vitest";
import { DI_MOVES, DI_VICTIMS } from "@/lib/diSurvival";
import { HIT_POSE_RULES, HURTBOXES, MOVE_LOOKS } from "@/lib/diVisuals.data";
import { hitPose, hitScene, hurtboxHit, hurtboxesAt, toSegment } from "@/lib/diVisuals";

const never = () => 0.99;
const always = () => 0;

describe("the DI trainer's hit visuals (round 977)", () => {
  it("has the game's data for every move and victim the trainer uses", () => {
    for (const m of DI_MOVES) expect(MOVE_LOOKS[m.key], m.key).toBeTruthy();
    for (const v of DI_VICTIMS) expect(HURTBOXES[v]?.length, v).toBeGreaterThan(5);
    // Read from the disc: Fox's up smash comes out on frame 7, Marth's tipper on 10, Rest on 1.
    expect(MOVE_LOOKS["fox-usmash"]).toMatchObject({ state: "AttackHi4", hit: 7, aerial: false });
    expect(MOVE_LOOKS["marth-fsmash"]).toMatchObject({ state: "AttackS4", hit: 10 });
    expect(MOVE_LOOKS["puff-rest"].hit).toBe(1);
    expect(MOVE_LOOKS["samus-charge"].shot).toMatchObject({ speed: 3, radius: 3.52 });
    expect(HIT_POSE_RULES).toEqual({ topFrom: 70, topTo: 110, rollFrom: 100, rollChance: 0.3 });
  });

  it("picks the hit pose as the game does", () => {
    expect(hitPose(1, 80, 120, always)).toBe("DamageFlyTop"); // sent up: Top, whatever the percent
    expect(hitPose(1, 44, 120, always)).toBe("DamageFlyRoll"); // from 100%, three times in ten
    expect(hitPose(1, 44, 120, never)).toBe("DamageFlyN");
    expect(hitPose(2, 44, 80, always)).toBe("DamageFlyHi"); // under 100%: no roll
    expect(hitPose(0, 136, 80, always)).toBe("DamageFlyLw"); // sent left at 44 degrees
  });

  it("puts the move's hitbox on the victim, facing them", () => {
    for (const m of DI_MOVES) {
      for (const v of DI_VICTIMS) {
        for (const facing of [1, -1] as const) {
          const s = hitScene(m.key, v, 20, facing, 44, 90, never)!;
          expect(s.facing).toBe(facing);
          // Never under the floor (an attacker whose hitbox is behind or on them can end up level with the victim).
          expect(s.ay).toBeGreaterThanOrEqual(0);
          const look = MOVE_LOOKS[m.key];
          if (look.boxes.length) {
            // An aerial's whole body is above the floor.
            if (look.aerial) expect(s.ay + look.boxes.find((b) => b[0] === s.hit)![4]).toBeGreaterThanOrEqual(-0.01);
            // The frame it lands on is one the box is out on, and there it touches a hurtbox.
            const box = look.boxes.find((b) => b[0] === s.hit)!;
            expect(box, `${m.key} on ${v}`).toBeTruthy();
            const boxes = hurtboxesAt(v, 20, (-facing) as 1 | -1);
            const [hx, hy] = [s.ax + facing * box[1], s.ay + box[2]];
            const hit = hurtboxHit(boxes, hx, hy, box[3]);
            expect(toSegment(hx, hy, hit!) - hit![4] - box[3], `${m.key} on ${v}`).toBeLessThanOrEqual(0);
            expect(s.windup).toBe(s.hit - 1);
          } else {
            expect(s.shot).toBeTruthy();
            expect(s.windup).toBeGreaterThan(10);
          }
        }
      }
    }
  });
});
