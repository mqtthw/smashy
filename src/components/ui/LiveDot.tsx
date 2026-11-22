/** The red "LIVE" badge with a pulsing dot. `children` replaces the word ("Game 2", "3 live"). */
export default function LiveDot({ children }: { children?: React.ReactNode }) {
  return (
    <span className="badge shrink-0 bg-brand text-on-brand">
      <span aria-hidden="true" className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-on-brand opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-on-brand" />
      </span>
      {children ?? "LIVE"}
    </span>
  );
}
