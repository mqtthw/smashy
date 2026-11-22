import { stageInitials, stageLayout } from "@/lib/stageLayouts";

/**
 * A stage's platform layout as a small drawing (our own simple diagram, for telling stages apart at a
 * glance). Stages without a drawing show their initials. Decorative: the stage name is always shown
 * next to it.
 */
export default function StageDiagram({ name, className = "h-10 w-20" }: { name: string; className?: string }) {
  const layout = stageLayout(name);
  if (!layout) {
    return (
      <span aria-hidden="true" className={`flex items-center justify-center rounded-md bg-surface-2 text-lg font-bold tracking-wide text-muted ${className}`}>
        {stageInitials(name)}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 100 56" aria-hidden="true" className={className}>
      <polygon points={layout.main} className="fill-current opacity-80" />
      {layout.platforms.map((p, i) => (
        <line
          key={i}
          x1={p.x1}
          x2={p.x2}
          y1={p.y}
          y2={p.y}
          stroke="currentColor"
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray={p.moves ? "5 4" : undefined}
        />
      ))}
    </svg>
  );
}
