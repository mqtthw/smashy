// Turning the "Cities" box on the scene request form into the scene's list of cities.

/** The longest city name kept; longer ones are cut (the real longest city names are well under this). */
export const MAX_CITY_LENGTH = 60;
/** The most cities a scene lists. */
export const MAX_CITIES = 20;

/**
 * Splits the comma-separated box into city names: trimmed, inner spaces collapsed, each cut to
 * MAX_CITY_LENGTH, repeats dropped (ignoring case), at most MAX_CITIES.
 */
export function parseSceneCities(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const city = part.replace(/\s+/g, " ").trim().slice(0, MAX_CITY_LENGTH).trim();
    if (!city) continue;
    const key = city.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(city);
    if (out.length >= MAX_CITIES) break;
  }
  return out;
}
