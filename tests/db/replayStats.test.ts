// Replay stats on a profile: each member saves, changes and removes only their own; others see them only
// when shown, and a teen's only when signed in.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const summary = { games: 3, wins: 2, losses: 1, minutes: 12, kills: 9, openingsPerKill: 4, damagePerOpening: 15, neutralWinRate: 0.5, counterHitRate: 0.3, inputsPerMinute: 300, lCancelRate: 0.8, byCharacter: [], byOpponentCharacter: [], byStage: [] };

describe.skipIf(!hasDb)("replay stats", () => {
  afterAll(cleanup);

  it("is each member's own, and shown only by choice", async () => {
    const [adult, teen, other] = await Promise.all([makeUser("ReplayAdult"), makeUser("ReplayTeen", { teen: true }), makeUser("ReplayOther")]);
    expect((await adult.c.from("replay_stats").insert({ user_id: adult.id, summary, games: 3 })).error).toBeNull();
    expect((await adult.c.from("replay_stats").insert({ user_id: other.id, summary, games: 3 })).error).not.toBeNull(); // not theirs
    expect((await teen.c.from("replay_stats").insert({ user_id: teen.id, summary, games: 3, shown: true })).error).toBeNull();

    // Hidden by default: only the owner sees it.
    const seen = async (c: typeof adult.c, id: string) => ((await c.from("replay_stats").select("user_id").eq("user_id", id)).data ?? []).length;
    expect(await seen(adult.c, adult.id)).toBe(1);
    expect(await seen(other.c, adult.id)).toBe(0);
    expect(await seen(guest(), adult.id)).toBe(0);

    // Shown: everyone sees an adult's; a teen's only signed-in viewers.
    await adult.c.from("replay_stats").update({ shown: true }).eq("user_id", adult.id);
    expect(await seen(guest(), adult.id)).toBe(1);
    expect(await seen(other.c, teen.id)).toBe(1);
    expect(await seen(guest(), teen.id)).toBe(0);

    // Nobody changes or removes someone else's.
    await other.c.from("replay_stats").update({ shown: false }).eq("user_id", adult.id);
    await other.c.from("replay_stats").delete().eq("user_id", adult.id);
    expect((await admin.from("replay_stats").select("shown").eq("user_id", adult.id).single()).data?.shown).toBe(true);
    // The owner removes their own.
    await adult.c.from("replay_stats").delete().eq("user_id", adult.id);
    expect(await seen(admin, adult.id)).toBe(0);
  });
});
