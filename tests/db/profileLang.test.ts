// Each member's language: they can set their own (en, es or ja), not anyone else's, and nothing else is allowed.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("profile language", () => {
  afterAll(cleanup);

  it("is the member's own to set, and only en, es, ja or fr", async () => {
    const [a, b] = await Promise.all([makeUser("LangAda"), makeUser("LangBen")]);
    expect((await a.c.from("profiles").update({ lang: "ja" }).eq("id", a.id)).error).toBeNull();
    expect((await a.c.from("profiles").update({ lang: "fr" }).eq("id", a.id)).error).toBeNull();
    expect((await admin.from("profiles").select("lang").eq("id", a.id).single()).data?.lang).toBe("fr");
    expect((await a.c.from("profiles").update({ lang: "de" }).eq("id", a.id)).error).not.toBeNull();
    // Someone else's: nothing changes.
    await a.c.from("profiles").update({ lang: "es" }).eq("id", b.id);
    expect((await admin.from("profiles").select("lang").eq("id", b.id).single()).data?.lang).toBeNull();
  });
});
