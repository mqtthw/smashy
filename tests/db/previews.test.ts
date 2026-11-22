// Link previews (the images iMessage/Discord/X show for a shared link) must never show what a guest
// can't see. Needs the app running (npm run dev); skipped otherwise.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, hasDb, makeUser, type TestUser } from "./helpers";

const APP = process.env.SMASHY_URL ?? "http://localhost:3000";
const appUp = await fetch(`${APP}/opengraph-image`, { signal: AbortSignal.timeout(20000) }).then((r) => r.ok).catch(() => false);
const get = async (path: string) => {
  const r = await fetch(APP + path);
  return { status: r.status, type: r.headers.get("content-type"), buf: Buffer.from(await r.arrayBuffer()) };
};

describe.skipIf(!hasDb || !appUp)("link previews", () => {
  let adult: TestUser, teen: TestUser, adultPost: string, teenPost: string;
  const handle = async (u: TestUser) => (await u.c.from("profiles").select("handle").eq("id", u.id).single()).data!.handle as string;

  beforeAll(async () => {
    adult = await makeUser("Previewer", { city: "San Antonio" });
    teen = await makeUser("TeenPrev", { teen: true, city: "San Antonio" });
    adultPost = (await adult.c.from("posts").insert({ author_id: adult.id, body: "see you at the weekly", game: "melee" }).select("id").single()).data!.id;
    teenPost = (await teen.c.from("posts").insert({ author_id: teen.id, body: "teen only words", game: "melee" }).select("id").single()).data!.id;
  }, 60000);
  afterAll(cleanup);

  it("adult posts and profiles get their own preview", async () => {
    const generic = await get("/post/00000000-0000-0000-0000-000000000000/opengraph-image");
    const post = await get(`/post/${adultPost}/opengraph-image`);
    const profile = await get(`/u/${await handle(adult)}/opengraph-image`);
    expect(post.type).toBe("image/png");
    expect(Buffer.compare(post.buf, generic.buf)).not.toBe(0);
    expect(Buffer.compare(profile.buf, generic.buf)).not.toBe(0);
  }, 60000);

  it("teen posts and profiles get the same generic card as a missing page", async () => {
    const generic = await get("/post/00000000-0000-0000-0000-000000000000/opengraph-image");
    const post = await get(`/post/${teenPost}/opengraph-image`);
    const profile = await get(`/u/${await handle(teen)}/opengraph-image`);
    expect(Buffer.compare(post.buf, generic.buf)).toBe(0);
    expect(Buffer.compare(profile.buf, generic.buf)).toBe(0);
  }, 60000);

  it("a teen's words never reach the page title or preview text", async () => {
    const html = await (await fetch(`${APP}/post/${teenPost}`)).text();
    expect(html).not.toContain("teen only words");
    expect(html).not.toContain("TeenPrev");
  }, 60000);
});
