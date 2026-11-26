// Smash terms & tech (round 914, Matthew: "a whole expanded page for smash terms & tech"). The words stay
// as players say them, in every language; the meanings are translated (people.gl.<id>, and people.new.w.*
// for the tournament words that started on the New players page). Plain facts about the games and how
// tournaments work, not advice.
//
// `id` is also the term's hashtag: a short clip posted with it (e.g. #wavedash) can become the looping
// clip beside the term (see clipCards.ts).
import type { MessageKey } from "./i18n/core";

export type Term = { id: string; term: string; key: MessageKey };
export type TermGroup = { id: "tournament" | "basics" | "melee" | "ultimate"; title: MessageKey; terms: Term[] };

const gl = (id: string, term: string): Term => ({ id, term, key: `people.gl.${id}` as MessageKey });
const w = (id: string, term: string, key: string): Term => ({ id, term, key: `people.new.w.${key}` as MessageKey });

export const GLOSSARY: TermGroup[] = [
  {
    id: "tournament",
    title: "people.gl.g.tournament",
    terms: [
      w("local", "Local", "local"),
      w("major", "Major", "major"),
      w("bracket", "Bracket", "bracket"),
      w("doubleelim", "Double elimination", "double"),
      w("set", "Set", "set"),
      w("seed", "Seed", "seed"),
      w("pools", "Pools", "pools"),
      w("friendlies", "Friendlies", "friendlies"),
      w("main", "Main", "main"),
      w("to", "TO", "to"),
      w("dq", "DQ", "dq"),
      w("netplay", "Netplay", "netplay"),
      gl("ruleset", "Ruleset"),
      gl("stagestrike", "Stage striking"),
      gl("counterpick", "Counterpick"),
      gl("ditto", "Ditto"),
      gl("johns", "Johns"),
    ],
  },
  {
    id: "basics",
    title: "people.gl.g.basics",
    terms: [
      w("stock", "Stock", "stock"),
      gl("percent", "Percent"),
      gl("knockback", "Knockback"),
      gl("blastzone", "Blast zone"),
      gl("sd", "SD"),
      gl("recovery", "Recovery"),
      gl("ledge", "Ledge"),
      gl("edgeguard", "Edgeguard"),
      gl("gimp", "Gimp"),
      gl("shield", "Shield"),
      gl("grab", "Grab"),
      gl("tilt", "Tilt"),
      gl("smashattack", "Smash attack"),
      gl("aerial", "Aerial"),
      gl("special", "Special"),
      gl("shorthop", "Short hop"),
      gl("fastfall", "Fast fall"),
      gl("airdodge", "Air dodge"),
      gl("spotdodge", "Spot dodge"),
      gl("tech", "Tech"),
      gl("di", "DI"),
      gl("neutral", "Neutral"),
      gl("spacing", "Spacing"),
      gl("combo", "Combo"),
      gl("punish", "Punish"),
      gl("outofshield", "Out of shield"),
      gl("hitbox", "Hitbox"),
      gl("framedata", "Frame data"),
    ],
  },
  {
    id: "melee",
    title: "people.gl.g.melee",
    terms: [
      gl("lcancel", "L-cancel"),
      gl("shffl", "SHFFL"),
      gl("wavedash", "Wavedash"),
      gl("dashdance", "Dash dance"),
      gl("crouchcancel", "Crouch cancel"),
      gl("shielddrop", "Shield drop"),
      gl("ledgedash", "Ledgedash"),
      gl("techchase", "Tech chase"),
      gl("chaingrab", "Chaingrab"),
    ],
  },
  {
    id: "ultimate",
    title: "people.gl.g.ultimate",
    terms: [
      gl("buffer", "Buffer"),
      gl("parry", "Parry"),
      gl("rar", "RAR"),
      gl("ledgetrap", "Ledge trap"),
    ],
  },
];

/** Every term's hashtag, for finding the clips posted with one. */
export const TERM_IDS: string[] = GLOSSARY.flatMap((g) => g.terms.map((t) => t.id));
