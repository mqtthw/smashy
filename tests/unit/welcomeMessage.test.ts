// The welcome message from @smashyhq (round 705) and clickable links in its messages.
import { describe, expect, it } from "vitest";
import { linkParts } from "@/lib/linkParts";
import { peopleEn as en } from "@/lib/i18n/sections/people.en";
import { peopleEs as es } from "@/lib/i18n/sections/people.es";
import { peopleFr as fr } from "@/lib/i18n/sections/people.fr";
import { peopleJa as ja } from "@/lib/i18n/sections/people.ja";

// The database's contact-info check for teen chats (private.has_contact_info), in JavaScript.
const contactInfo = (t: string) =>
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|gg|io|me|tv|co|ly|app|link|xyz)\b)/i.test(t) ||
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t) ||
  /(\d[\s().-]?){9}\d/.test(t) ||
  /(^|\s)@[a-z0-9_.]{2,}/i.test(t) ||
  /\b(snap ?chat|instagram|insta|tiktok|whats ?app|telegram|kik)\b/i.test(t) ||
  /\b(add|dm|message|hmu|hit me up|text|call) me (on|at|in)\b/i.test(t) ||
  /\bmy (discord|snap|insta|number|phone|socials?)\b/i.test(t) ||
  /\bdiscord (id|tag|name|user(name)?)\b/i.test(t);

describe("welcome message", () => {
  it("has no link or contact info in the teen version (teen chats refuse them)", () => {
    for (const lang of [en, es, fr, ja] as Record<string, string>[]) {
      expect(contactInfo(lang["people.welcomeDm.teen"].replace("{tag}", "Player"))).toBe(false);
      expect(lang["people.welcomeDm.adult"]).toContain("{link}");
    }
  });
  it("splits out https links, leaving a final full stop outside", () => {
    expect(linkParts("Join: https://discord.gg/abc. Thanks")).toEqual([
      { text: "Join: " },
      { text: "https://discord.gg/abc", href: "https://discord.gg/abc" },
      { text: ". Thanks" },
    ]);
    expect(linkParts("no links here")).toEqual([{ text: "no links here" }]);
  });
});
