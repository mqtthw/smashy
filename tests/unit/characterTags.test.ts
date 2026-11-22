import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/lib/characters";
import { GAME_KEYS } from "@/lib/games";
import { chatBodyParts, chatTextForCheck, characterTagText, tagOfKey, tagSuggestions, taggedCharacters } from "@/lib/characterTags";
import { chatContactInfoReason } from "@/lib/guardrails";

describe("character tags", () => {
  it("every character's tag text matches its key, and no two characters in a game share a tag", () => {
    for (const g of GAME_KEYS) {
      const seen = new Set<string>();
      for (const c of CHARACTERS[g]) {
        expect(characterTagText(c).toLowerCase()).toBe(tagOfKey(c.key));
        expect(seen.has(tagOfKey(c.key))).toBe(false);
        expect(tagOfKey(c.key)).not.toBe("matchmaking");
        seen.add(tagOfKey(c.key));
      }
    }
  });

  it("finds tagged characters for the room's game, any case, at most 3", () => {
    expect(taggedCharacters("melee", "anyone @Fox or @captainfalcon?")).toEqual(["fox", "captain-falcon"]);
    expect(taggedCharacters("melee", "@MrGameAndWatch @DrMario @ROB")).toEqual(["mr-game-and-watch", "dr-mario"]); // no R.O.B. in Melee
    expect(taggedCharacters("melee", "@fox @falco @marth @sheik")).toHaveLength(3);
    expect(taggedCharacters("melee", "email me fox@site.com")).toEqual([]);
    expect(taggedCharacters("melee", "@foxy")).toEqual([]);
    expect(taggedCharacters("ultimate", "@PokemonTrainer pls")).toEqual(["pokemon-trainer"]);
  });

  it("chat lets @matchmaking and character tags through, but not other handles", () => {
    expect(chatTextForCheck("@Fox @matchmaking @someone")).toBe("Fox matchmaking @someone");
    expect(chatContactInfoReason("need @Marth practice")).toBeNull();
    expect(chatContactInfoReason("follow @someone123")).not.toBeNull();
  });

  it("splits a message into text and character tags for showing icons", () => {
    expect(chatBodyParts("melee", "need @fox and @CaptainFalcon pls")).toEqual([
      { text: "need " },
      { character: "fox", name: "Fox", tag: "@fox" },
      { text: " and " },
      { character: "captain-falcon", name: "Captain Falcon", tag: "@CaptainFalcon" },
      { text: " pls" },
    ]);
    expect(chatBodyParts("melee", "@Fox")).toEqual([{ character: "fox", name: "Fox", tag: "@Fox" }]);
    expect(chatBodyParts("melee", "me@fox and @ROB and @matchmaking")).toEqual([{ text: "me@fox and @ROB and @matchmaking" }]);
    expect(chatBodyParts(null, "@Fox")).toEqual([{ text: "@Fox" }]);
  });

  it("suggests @matchmaking and characters while typing", () => {
    expect(tagSuggestions("melee", "")[0]).toBe("matchmaking");
    expect(tagSuggestions("melee", "fa")).toEqual(["Falco"]);
    expect(tagSuggestions("melee", "capt")).toEqual(["CaptainFalcon"]);
    expect(tagSuggestions(null, "fo")).toEqual([]);
  });
});
