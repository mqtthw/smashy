// Round 7: lobby connect codes can't be phone numbers (Switch friend codes are fine); majors keep a time zone.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("round 7", () => {
  afterAll(cleanup);

  it("blocks phone numbers as a lobby connect code, allows friend codes and Slippi codes", async () => {
    const [host, host2] = await Promise.all([makeUser("R7Host"), makeUser("R7Host2")]);
    const lobby = (connect_info: string, h = host) =>
      h.c.from("lobbies").insert({
        host_id: h.id, game: "ultimate", title: "Friendlies", mode: "friendlies", connect_info,
        region: "Anywhere", skill: "any", closes_at: new Date(Date.now() + 3600_000).toISOString(),
      });
    expect((await lobby("214 555 1234")).error).not.toBeNull();
    expect((await lobby("214-555-1234")).error).not.toBeNull();
    expect((await lobby("SW-1234-5678-9012")).error).toBeNull();
    expect((await lobby("ABCD#123", host2)).error).toBeNull(); // one open lobby per host
  });

  it("majors have a time zone column", async () => {
    const { error } = await admin.from("majors").select("timezone").limit(1);
    expect(error).toBeNull();
  });
});
