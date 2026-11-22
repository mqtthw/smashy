const SIZES = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-16 w-16 text-2xl",
} as const;

// Letter avatars get one of these tints, picked from the name, so people are easier to tell apart.
// Mid-tone colors on a see-through tint read well in both light and dark themes.
const TINTS = [
  "bg-red-500/15 text-red-500",
  "bg-orange-500/15 text-orange-500",
  "bg-amber-500/15 text-amber-500",
  "bg-lime-500/15 text-lime-500",
  "bg-emerald-500/15 text-emerald-500",
  "bg-cyan-500/15 text-cyan-500",
  "bg-blue-500/15 text-blue-500",
  "bg-violet-500/15 text-violet-500",
  "bg-fuchsia-500/15 text-fuchsia-500",
];

/** The first character of a name as people see it (a whole emoji or accented letter, not half of one). */
export function firstGrapheme(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const first = Seg ? new Seg("en", { granularity: "grapheme" }).segment(trimmed)[Symbol.iterator]().next().value?.segment : Array.from(trimmed)[0];
  return (first ?? "?").toUpperCase();
}

export function tintFor(name: string): string {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Round profile picture: their uploaded picture, or the first letter of their tag on a color picked from it. */
export default function Avatar({ name, src, size = "md", className = "" }: { name: string; src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden="true" loading="lazy" className={`shrink-0 rounded-full bg-surface-2 object-cover ${SIZES[size]} ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-bold ${tintFor(name)} ${SIZES[size]} ${className}`}
    >
      {firstGrapheme(name)}
    </span>
  );
}
