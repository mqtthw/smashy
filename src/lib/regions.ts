// Regions: where someone plays, so Events, the visitor home page and the weekly digest show their
// area. A region is a US state ("US-TX"), a Canadian province ("CA-ON"), or a country ("JP").
// start.gg can search tournaments by any of these. Shared by server and browser code.

export type Region = { code: string; name: string; group: "United States" | "Canada" | "Countries" };

const US: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "Washington, D.C."], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
const CANADA: [string, string][] = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"],
  ["NS", "Nova Scotia"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"],
];
// Countries and territories with Smash scenes on start.gg (more can be added any time). Puerto Rico is
// here, not under US states: start.gg files its tournaments under country code PR.
const COUNTRIES: [string, string][] = [
  ["PR", "Puerto Rico"], ["MX", "Mexico"], ["GT", "Guatemala"], ["SV", "El Salvador"], ["HN", "Honduras"], ["NI", "Nicaragua"],
  ["CR", "Costa Rica"], ["PA", "Panama"], ["CU", "Cuba"], ["JM", "Jamaica"], ["TT", "Trinidad and Tobago"], ["VE", "Venezuela"],
  ["EC", "Ecuador"], ["BO", "Bolivia"], ["PY", "Paraguay"], ["UY", "Uruguay"], ["GB", "United Kingdom"], ["IE", "Ireland"], ["FR", "France"], ["DE", "Germany"], ["ES", "Spain"],
  ["IT", "Italy"], ["NL", "Netherlands"], ["BE", "Belgium"], ["CH", "Switzerland"], ["AT", "Austria"], ["SE", "Sweden"],
  ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"], ["IS", "Iceland"], ["PL", "Poland"], ["PT", "Portugal"],
  ["CZ", "Czechia"], ["SK", "Slovakia"], ["HU", "Hungary"], ["RO", "Romania"], ["BG", "Bulgaria"], ["GR", "Greece"],
  ["HR", "Croatia"], ["SI", "Slovenia"], ["RS", "Serbia"], ["UA", "Ukraine"], ["LT", "Lithuania"], ["LV", "Latvia"],
  ["EE", "Estonia"], ["LU", "Luxembourg"], ["TR", "Turkey"], ["IL", "Israel"], ["AE", "United Arab Emirates"],
  ["SA", "Saudi Arabia"], ["EG", "Egypt"], ["MA", "Morocco"], ["ZA", "South Africa"], ["NG", "Nigeria"],
  ["JP", "Japan"], ["KR", "South Korea"], ["CN", "China"], ["TW", "Taiwan"], ["HK", "Hong Kong"], ["IN", "India"],
  ["SG", "Singapore"], ["MY", "Malaysia"], ["TH", "Thailand"], ["VN", "Vietnam"], ["ID", "Indonesia"], ["PH", "Philippines"],
  ["AU", "Australia"], ["NZ", "New Zealand"],
  ["BR", "Brazil"], ["CL", "Chile"], ["AR", "Argentina"], ["PE", "Peru"], ["CO", "Colombia"], ["DO", "Dominican Republic"],
];

export const REGIONS: Region[] = [
  ...US.map(([c, n]) => ({ code: `US-${c}`, name: n, group: "United States" as const })),
  ...CANADA.map(([c, n]) => ({ code: `CA-${c}`, name: n, group: "Canada" as const })),
  ...COUNTRIES.map(([c, n]) => ({ code: c, name: n, group: "Countries" as const })).sort((a, b) => a.name.localeCompare(b.name)),
];
const BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));

/** Where Smashy started: the default when nothing else is known. */
export const HOME_REGION = "US-TX";

export const isRegion = (code: unknown): code is string => typeof code === "string" && BY_CODE.has(code);
export const regionName = (code: string | null | undefined) => (code && BY_CODE.get(code)?.name) || "Texas";

/** start.gg's tournament search filter for a region. */
export function startggRegionFilter(code: string): { countryCode: string; addrState?: string } {
  const [country, state] = code.split("-");
  return state ? { countryCode: country, addrState: state } : { countryCode: country };
}

/**
 * A region from the rough location Vercel adds to each request (country, and the state/province code
 * for the US and Canada). Nothing is stored. Null if unknown or not a region Smashy lists.
 */
export function regionFromGeo(country: string | null | undefined, area: string | null | undefined): string | null {
  const c = String(country ?? "").toUpperCase();
  const a = String(area ?? "").toUpperCase();
  if ((c === "US" || c === "CA") && a) return isRegion(`${c}-${a}`) ? `${c}-${a}` : null;
  return isRegion(c) ? c : null;
}
