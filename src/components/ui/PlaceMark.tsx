// A placement as a small numbered tile: gold, silver and bronze for 1st to 3rd (the same metals in
// both themes, like real medals), a quiet grey tile below that. Used where results list places
// (a bracket's Top 8, a player's top 8s at majors) instead of medal emoji. Safe on the server.

const METAL: Record<number, string> = {
  1: "bg-[var(--gold)] text-[var(--on-gold)]",
  2: "bg-[var(--silver)] text-[var(--on-silver)]",
  3: "bg-[var(--bronze)] text-[var(--on-bronze)]",
};

/** `label` is the place in words for screen readers ("1st"); the tile itself shows just the number. */
export default function PlaceMark({ place, label, size = "md" }: { place: number; label?: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-5 min-w-5 text-[0.6875rem]" : "h-6 min-w-6 text-meta";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md px-1 font-bold tabular-nums ${box} ${METAL[place] ?? "bg-surface-2 text-muted"}`}
      aria-label={label}
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
    >
      {place}
    </span>
  );
}
