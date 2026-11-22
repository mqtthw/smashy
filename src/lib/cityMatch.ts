// Comparing a person's home city with an event's city: whole city names, ignoring what comes after a
// comma (", TX", ", ON", ", England"), a trailing state like " TX", case and extra spaces, with a few
// common nicknames (SA, SATX, ATX, HTX, DFW...). Shared, no imports.

const ALIASES: Record<string, string> = {
  sa: "san antonio", satx: "san antonio", "s.a.": "san antonio",
  atx: "austin", htx: "houston", "h-town": "houston", dtx: "dallas", dfw: "dallas",
  ep: "el paso", ctx: "corpus christi", corpus: "corpus christi",
  nyc: "new york", la: "los angeles", sf: "san francisco", philly: "philadelphia", chi: "chicago", atl: "atlanta",
  dc: "washington", vegas: "las vegas", nola: "new orleans",
};

export function normalizeCity(city: string | null | undefined): string {
  const raw = String(city ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (ALIASES[raw]) return ALIASES[raw]; // nicknames first (so "ATX" isn't read as "A" + "TX")
  const c = raw
    .split(",")[0] // "San Antonio, TX" -> "san antonio"; "Toronto, ON" -> "toronto"
    .replace(/\s+(tx|texas)\.?$/, "") // "San Antonio TX" (no comma)
    .trim();
  return ALIASES[c] ?? c;
}

/** True when both name the same city ("San Antonio, TX" = "SATX" = "san antonio"). */
export function sameCity(home: string | null | undefined, eventCity: string | null | undefined): boolean {
  const a = normalizeCity(home);
  return !!a && a === normalizeCity(eventCity);
}

/** A city as people write it: "san antonio" -> "San Antonio". */
export function displayCity(city: string | null | undefined): string {
  return normalizeCity(city).replace(/(^|\s|-)\p{L}/gu, (m) => m.toUpperCase());
}
