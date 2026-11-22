// The VOD library's table: anyone can read the list, nobody writes it directly (the site adds and
// removes links on the server), who added a link isn't public, and only video addresses fit.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("set VODs", () => {
  afterAll(cleanup);

  it("is public to read, closed to write, and takes only video links", async () => {
    const [adder, other] = await Promise.all([makeUser("SvAdder"), makeUser("SvOther")]);
    const row = { source: "startgg", set_id: "123456789", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", p1_tag: "Ada", p2_tag: "Ben", tournament: "Test Weekly", added_by: adder.id };

    // The server adds it.
    const { data: added, error } = await admin.from("set_vods").insert(row).select("id").single();
    expect(error).toBeNull();

    // Anyone reads the list, but not who added it.
    expect((await guest().from("set_vods").select("url, p1_tag").eq("id", added!.id)).data).toEqual([{ url: row.url, p1_tag: "Ada" }]);
    expect((await guest().from("set_vods").select("added_by").eq("id", added!.id)).error).not.toBeNull();

    // Members can't add, change or remove links directly, even their own.
    for (const who of [adder.c, other.c]) {
      expect((await who.from("set_vods").insert({ ...row, url: "https://youtu.be/abcdefghijk", added_by: adder.id })).error).not.toBeNull();
      expect((await who.from("set_vods").update({ p1_tag: "Hacked" }).eq("id", added!.id).select("id")).data ?? []).toEqual([]);
      expect((await who.from("set_vods").delete().eq("id", added!.id).select("id")).data ?? []).toEqual([]);
    }
    expect((await admin.from("set_vods").select("p1_tag").eq("id", added!.id).single()).data?.p1_tag).toBe("Ada");

    // Only video sites fit, even for the server; the same link can't be added to a set twice.
    for (const bad of ["https://evil.example/watch?v=dQw4w9WgXcQ", "http://www.youtube.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)"]) {
      expect((await admin.from("set_vods").insert({ ...row, url: bad })).error, bad).not.toBeNull();
    }
    expect((await admin.from("set_vods").insert(row)).error?.code).toBe("23505");
  });
});
