// Regions: For You boosts and explains posts from the viewer's own region.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("regions", () => {
  afterAll(cleanup);

  it("a popular post from your region says Popular in <region>", async () => {
    const [author, viewer, f1, f2, f3] = await Promise.all(["RgA", "RgV", "RgF1", "RgF2", "RgF3"].map((l) => makeUser(l)));
    await admin.from("profiles").update({ region: "CA-ON" }).in("id", [author.id, viewer.id]);
    const { data: post } = await author.c.from("posts").insert({ author_id: author.id, game: "melee", body: "Toronto weekly tonight" }).select("id").single();
    for (const f of [f1, f2, f3]) await f.c.from("post_likes").insert({ post_id: post!.id, user_id: f.id });
    const { data } = await viewer.c.rpc("for_you_feed", { p_game: null, p_limit: 50, p_offset: 0, p_as_of: null, p_region: null });
    const row = (data as { post_id: string; reason: string | null; reason_detail: string | null }[]).find((r) => r.post_id === post!.id);
    expect(row?.reason).toBe("region");
    expect(row?.reason_detail).toBe("CA-ON");
    // Someone in another region doesn't get the region reason for it.
    const { data: other } = await f1.c.rpc("for_you_feed", { p_game: null, p_limit: 50, p_offset: 0, p_as_of: null, p_region: null });
    expect((other as { post_id: string; reason: string | null }[]).find((r) => r.post_id === post!.id)?.reason).not.toBe("region");
  });
});
