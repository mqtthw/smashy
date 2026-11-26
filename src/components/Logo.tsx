// The Smashy wordmark (round 860): the word "Smashy" set in the site's own typeface, extra bold, in
// the logo red. Plain on purpose: the earlier flame-filled logo was AI-made, and Matthew chose an
// honest type wordmark until an artist draws a real one (the old drawing's source files are still in
// assets/logo/, and the app icon and link-preview pictures still use them).
//
// Size it with a text-size class, as before; the letters sit on the text baseline, so it lines up
// next to words ("Join Smashy").

export default function Logo({
  className = "text-3xl",
  markOnly = false,
  label = "Smashy",
}: {
  className?: string;
  markOnly?: boolean; // just the S on a red tile (for small spaces)
  label?: string;
}) {
  return (
    <span role="img" aria-label={label} className={`inline-flex items-baseline leading-none ${className}`}>
      {markOnly ? (
        <span
          aria-hidden="true"
          className="inline-flex size-[1.25em] items-center justify-center rounded-[0.22em] bg-[var(--logo)] font-black text-white"
          style={{ fontSize: "1em", lineHeight: 1 }}
        >
          <span style={{ fontSize: "0.8em", position: "relative", top: "0.02em" }}>S</span>
        </span>
      ) : (
        <span aria-hidden="true" className="font-black tracking-[-0.035em] text-[var(--logo)]" style={{ fontSize: "1.05em" }}>
          Smashy
        </span>
      )}
    </span>
  );
}
