// Tables only the server's background jobs use (refresh locks, the saved Events list).
// Nobody should be able to read or change them through the public API.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

const TABLES = ["events_sync", "majors_sync", "reels_sync"];

describe.skipIf(!hasDb)("server-only tables", () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await makeUser("JobPeek");
  });
  afterAll(cleanup);

  for (const table of TABLES) {
    it(`${table}: guests and players can't read or write it`, async () => {
      for (const c of [guest(), user.c]) {
        const read = await c.from(table).select("*");
        expect(read.error?.message ?? "").toMatch(/permission denied/);
        const write = await c.from(table).update({ last_run: new Date().toISOString() }).eq("id", 1);
        expect(write.error?.message ?? "").toMatch(/permission denied/);
      }
    });
  }

  it("players can't run the refresh-lock functions", async () => {
    const { error } = await user.c.rpc("claim_refresh", { job: "events", every_minutes: 0 });
    expect(error).not.toBeNull();
  });
});
