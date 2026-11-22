// Simple placeholder used by tabs that aren't built yet.
import { T } from "@/lib/i18n/client";

export default function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <section className="flex flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted">{blurb}</p>
      <span className="badge w-fit bg-surface-2 text-muted"><T k="media.comingSoon" /></span>
    </section>
  );
}
