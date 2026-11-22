// The structured fields a ruleset can have, per game, with beginner-friendly explanations.
// Rulesets are stored as { [field key]: value } so the compare view can match fields across scenes.
// Shared by server and browser code (no server-only imports).
import type { GameKey } from "./games";

export type FieldValue = number | boolean | string | string[] | null;

export type RuleField =
  | { key: string; label: string; help: string; type: "number"; min: number; max: number; unit?: string }
  | { key: string; label: string; help: string; type: "boolean"; yes?: string; no?: string }
  | { key: string; label: string; help: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; help: string; type: "stages" }
  | { key: string; label: string; help: string; type: "text"; placeholder?: string };

export type FieldGroup = { title: string; fields: RuleField[] };

export const STAGES: Record<GameKey, string[]> = {
  melee: ["Battlefield", "Final Destination", "Yoshi's Story", "Fountain of Dreams", "Pokémon Stadium", "Dream Land N64"],
  ultimate: [
    "Battlefield", "Small Battlefield", "Final Destination", "Pokémon Stadium 2", "Smashville", "Town and City",
    "Hollow Bastion", "Kalos Pokémon League", "Yoshi's Story", "Lylat Cruise", "Northern Cave", "Yoshi's Island (Brawl)",
  ],
  pplus: [
    "Battlefield", "Final Destination", "Dreamland", "Fountain of Dreams", "Pokémon Stadium 2", "Smashville",
    "Yoshi's Story", "Lylat Cruise", "WarioWare, Inc.", "Yoshi's Island",
  ],
  smash64: ["Dream Land", "Hyrule Castle", "Peach's Castle", "Congo Jungle", "Saffron City", "Yoshi's Island", "Planet Zebes", "Mushroom Kingdom"],
  brawl: [
    "Battlefield", "Final Destination", "Smashville", "Yoshi's Island (Brawl)", "Lylat Cruise", "Pokémon Stadium",
    "Pokémon Stadium 2", "Halberd", "Castle Siege", "Frigate Orpheon", "Delfino Plaza", "Rainbow Cruise", "Brinstar", "Norfair",
  ],
  smash4: [
    "Battlefield", "Final Destination", "Smashville", "Town and City", "Dream Land 64", "Lylat Cruise", "Duck Hunt",
    "Castle Siege", "Kalos Pokémon League", "Delfino Plaza", "Pokémon Stadium 2", "Halberd",
  ],
};

const formatGroup: FieldGroup = {
  title: "Match format",
  fields: [
    { key: "stocks", label: "Stocks", help: "How many lives each player starts with in a game.", type: "number", min: 1, max: 99 },
    { key: "timer", label: "Timer", help: "Game time limit. If time runs out, the player with more stocks (then lower percent) wins.", type: "number", min: 1, max: 99, unit: "min" },
    { key: "best_of", label: "Sets are best of", help: "How many games a set can last. Best of 3 = first to win 2 games.", type: "number", min: 1, max: 9 },
    { key: "best_of_top", label: "Top bracket sets are best of", help: "Many scenes switch to longer sets near the end of bracket (often from Top 8).", type: "number", min: 1, max: 9 },
    { key: "best_of_top_from", label: "Longer sets start from", help: "Which part of bracket uses the longer sets.", type: "text", placeholder: "e.g. Top 8, Winners Finals" },
  ],
};

const stagesGroup: FieldGroup = {
  title: "Stages",
  fields: [
    { key: "starters", label: "Starter stages", help: "Stages that can be picked for game 1 of a set.", type: "stages" },
    { key: "counterpicks", label: "Counterpick stages", help: "Extra stages the loser of a game may pick for the next game.", type: "stages" },
    { key: "game1_striking", label: "Game 1 stage striking", help: "How players remove (\"strike\") starters until one is left for game 1. \"1-2-1\" means player A strikes 1, B strikes 2, A strikes 1.", type: "text", placeholder: "e.g. 1-2-1" },
    { key: "counterpick_bans", label: "Bans after each game", help: "After game 1, the winner bans this many stages before the loser picks.", type: "number", min: 0, max: 10 },
    { key: "counterpick_bans_top", label: "Bans after each game in the longer sets", help: "Only if your longer sets (often best of 5 from Top 8) use a different number of bans, such as 0 for no bans. Leave empty to use the same number in every set.", type: "number", min: 0, max: 10 },
    {
      key: "dsr",
      label: "Dave's Stupid Rule (DSR)",
      help: "Limits re-picking stages. Standard DSR: you can't pick a stage you already won on in this set.",
      type: "select",
      options: [
        { value: "none", label: "No DSR" },
        { value: "standard", label: "Standard DSR" },
        { value: "modified", label: "Modified DSR (only your last win)" },
      ],
    },
    { key: "gentlemans", label: "Gentleman's agreements", help: "Players may both agree to play on any stage, even one that isn't legal.", type: "boolean", yes: "Allowed", no: "Not allowed" },
  ],
};

const conductGroup: FieldGroup = {
  title: "Players & setups",
  fields: [
    {
      key: "coaching",
      label: "Coaching",
      help: "Whether someone can give a player advice during a set.",
      type: "select",
      options: [
        { value: "allowed", label: "Allowed anytime" },
        { value: "between_games", label: "Between games only" },
        { value: "not_allowed", label: "Not allowed" },
      ],
    },
    { key: "bring_setup", label: "Bring-your-setup perks", help: "Anything special for players who bring a console/TV (e.g. free or discounted entry).", type: "text", placeholder: "e.g. $5 off entry" },
  ],
};

export const RULESET_FIELDS = {
  melee: [
    formatGroup,
    stagesGroup,
    {
      title: "Melee specifics",
      fields: [
        { key: "wobbling", label: "Wobbling", help: "An Ice Climbers technique that can hold an opponent in an infinite grab. Some scenes ban it.", type: "boolean", yes: "Allowed", no: "Banned" },
        { key: "ledge_grab_limit", label: "Ledge-grab limit (on timeout)", help: "If a game times out, a player who grabbed the ledge more than this many times loses. Leave empty for no limit.", type: "number", min: 0, max: 200 },
        { key: "controllers", label: "Controller rules", help: "Which controllers or mods are allowed (e.g. box controllers, notches).", type: "text", placeholder: "e.g. Follow the 2024 controller ruleset" },
      ],
    },
    conductGroup,
  ],
  ultimate: [
    formatGroup,
    stagesGroup,
    {
      title: "Ultimate specifics",
      fields: [
        { key: "hazards", label: "Stage hazards", help: "Whether stage hazards (moving parts, events) are on.", type: "boolean", yes: "On", no: "Off" },
        { key: "stage_morph", label: "Stage Morph", help: "Ultimate setting that changes the stage mid-game.", type: "boolean", yes: "On", no: "Off" },
        { key: "spirits", label: "Spirits", help: "Spirit bonuses from World of Light / Spirit Board.", type: "boolean", yes: "On", no: "Off" },
        { key: "mii_fighters", label: "Mii Fighters", help: "Which Mii Fighter custom moves are allowed.", type: "text", placeholder: "e.g. All move sets legal" },
      ],
    },
    conductGroup,
  ],
  pplus: [
    formatGroup,
    stagesGroup,
    {
      title: "Project+ specifics",
      fields: [
        { key: "pplus_version", label: "Project+ version", help: "Which release of P+ setups must run.", type: "text", placeholder: "e.g. 3.1" },
        { key: "ledge_grab_limit", label: "Ledge-grab limit (on timeout)", help: "If a game times out, a player who grabbed the ledge more than this many times loses. Leave empty for no limit.", type: "number", min: 0, max: 200 },
        { key: "controllers", label: "Controller rules", help: "Which controllers are allowed.", type: "text", placeholder: "e.g. GameCube, Wii Classic Pro" },
      ],
    },
    conductGroup,
  ],
} as Record<GameKey, FieldGroup[]>;

// Older games: the shared format, stage and setup rules, plus a free-text box for anything game-specific.
const legacyRules = (title: string, placeholder: string): FieldGroup[] => [
  formatGroup,
  stagesGroup,
  { title, fields: [{ key: "game_notes", label: "Other rules", help: "Anything specific to this game's ruleset.", type: "text", placeholder }] },
  conductGroup,
];
RULESET_FIELDS.smash64 = legacyRules("64 specifics", "e.g. Items off, Dream Land only for game 1");
RULESET_FIELDS.brawl = legacyRules("Brawl specifics", "e.g. Meta Knight allowed, ledge-grab limit 35");
RULESET_FIELDS.smash4 = legacyRules("Smash 4 specifics", "e.g. Wii U version, custom moves off");

export function allFields(game: GameKey): RuleField[] {
  return RULESET_FIELDS[game].flatMap((g) => g.fields);
}

/** Show a stored value in plain words. */
export function displayValue(field: RuleField, value: FieldValue | undefined): string {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return "—";
  switch (field.type) {
    case "number":
      return `${value}${field.unit ? ` ${field.unit}` : ""}`;
    case "boolean":
      return value ? field.yes ?? "Yes" : field.no ?? "No";
    case "select":
      return field.options.find((o) => o.value === value)?.label ?? String(value);
    case "stages":
      return (value as string[]).join(", ");
    default:
      return String(value);
  }
}

/** Keep only known fields with valid values (used before saving, so stored rules stay clean). */
export function sanitizeRules(game: GameKey, input: Record<string, unknown>): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of allFields(game)) {
    const v = input[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "number") {
      const n = Number(v);
      if (Number.isInteger(n) && n >= f.min && n <= f.max) out[f.key] = n;
    } else if (f.type === "boolean") {
      if (v === true || v === "true") out[f.key] = true;
      else if (v === false || v === "false") out[f.key] = false;
    } else if (f.type === "select") {
      if (f.options.some((o) => o.value === v)) out[f.key] = String(v);
    } else if (f.type === "stages") {
      const list = (Array.isArray(v) ? v : [v]).map((s) => String(s).trim()).filter((s) => s && s.length <= 40);
      if (list.length) out[f.key] = [...new Set(list)].slice(0, 30);
    } else {
      const s = String(v).trim().slice(0, 200);
      if (s) out[f.key] = s;
    }
  }
  return out;
}

/** Are two stored values the same? (Stage lists compare as sets.) */
export function sameValue(a: FieldValue | undefined, b: FieldValue | undefined): boolean {
  const norm = (v: FieldValue | undefined) =>
    v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
      ? null
      : Array.isArray(v)
        ? JSON.stringify([...v].sort())
        : JSON.stringify(v);
  return norm(a) === norm(b);
}
