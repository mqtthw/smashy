// The Monday "Clips of the week" post (round 843), end to end. It posts as @smashyhq, so it runs only on
// the TEST database (docs/test-database.md), never the live one.
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {}, refresh: () => {}, revalidateTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {}, after: () => {} }));
vi.mock("@/lib/supabase/server", async () => {
  const { guest } = await import("./helpers");
  return { createClient: async () => guest(), getUserId: async () => null };
});
import { admin, cleanup, hasDb, makeUser } from "./helpers";

const onTestDb = hasDb && (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes("lzjcmvexbgtslrcqwoda");

describe.skipIf(!onTestDb)("Clips of the week post", () => {
  afterAll(async () => {
    await cleanup();
  });

  it("posts the week's liked clips from @smashyhq on a Monday, once", async () => {
    const hq = await makeUser("Hq");
    await admin.from("profiles").update({ handle: "smashyhq" }).eq("id", hq.id);
    const player = await makeUser("Clipper", { games: ["melee"] });
    const fan = await makeUser("Fan");
    const { data: made, error } = await player.c
      .from("posts")
      .insert([
        { author_id: player.id, game: "melee", body: "Insane edgeguard\nhttps://www.youtube.com/watch?v=E-YAmXmyqsc" },
        { author_id: player.id, game: "melee", body: "No video here, just words" },
      ])
      .select("id, body");
    expect(error).toBeNull();
    const clip = made!.find((p) => p.body.includes("youtube"))!;
    for (const p of made!) await fan.c.from("post_likes").insert({ post_id: p.id, user_id: fan.id });

    const { postClipsOfWeek } = await import("@/lib/clipsOfWeekPostRun");
    expect(await postClipsOfWeek(new Date("2026-11-25T11:00:00Z"))).toBe("not Monday");
    const monday = new Date();
    monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7 || 7)); // next Monday, posts still within 7 days
    monday.setUTCHours(11, 0, 0, 0);
    // The pick counts the last 7 days from now; on that Monday the clip is still at most 7 days old.
    expect(await postClipsOfWeek(monday)).toBe("posted");
    expect(await postClipsOfWeek(monday)).toBe("already posted");

    const { data: posts } = await admin.from("posts").select("title, body, flair, game").eq("author_id", hq.id);
    expect(posts).toHaveLength(1);
    expect(posts![0].title).toMatch(/^Clips of the week · /);
    expect(posts![0].flair).toBe("news");
    expect(posts![0].body).toContain(`/post/${clip.id}`);
    expect(posts![0].body).toContain("https://www.youtube.com/watch?v=E-YAmXmyqsc");
    expect(posts![0].body).toMatch(/by @clipper_/);
    expect(posts![0].body).not.toContain("No video here");
  });
});
