// Upset markers: when a lower seed beats a higher one, how big the upset was. This is the "upset
// factor" the community already uses on start.gg brackets: seeds are grouped by the placement they
// are expected to reach in double elimination (1st, 2nd, 3rd, 4th, 5th-6th, 7th-8th, 9th-12th…),
// and the factor is how many groups apart the two players are. Seed 9 beating seed 1 is +6.
const GROUP_STARTS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025];

/** Which expected-placement group a seed is in (seed 1 is 1, seeds 5 and 6 are 5, seeds 9 to 12 are 7…). */
export function seedGroup(seed: number): number {
  let group = 0;
  for (const start of GROUP_STARTS) if (seed >= start) group++;
  return group;
}

/** How big an upset a win was: 0 when the better (or an equal-group) seed won, or a seed is unknown. */
export function upsetFactor(winnerSeed: number | null | undefined, loserSeed: number | null | undefined): number {
  if (!winnerSeed || !loserSeed || winnerSeed < 1 || loserSeed < 1) return 0;
  return Math.max(0, seedGroup(winnerSeed) - seedGroup(loserSeed));
}
