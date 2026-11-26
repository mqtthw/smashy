// Distance between two points on the map (round 855: Events' "Near me"). Plain logic, no browser.

export type Point = { lat: number; lng: number };

/** Kilometres between two points, along the Earth's surface. */
export function kmBetween(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** How far "Near me" reaches: about 50 miles, a normal drive to a weekly. */
export const NEAR_KM = 80;

/** Whether a place with known coordinates is within reach of `here`; places without coordinates aren't. */
export function isNear(here: Point, lat: number | null | undefined, lng: number | null | undefined, km = NEAR_KM): boolean {
  return typeof lat === "number" && typeof lng === "number" && kmBetween(here, { lat, lng }) <= km;
}
