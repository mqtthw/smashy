import LocalTime from "@/components/ui/LocalTime";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { FREE_LIMITS, getUsage } from "@/lib/accounts";
import { listErrors } from "@/lib/errorLog";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { resolveError } from "../actions";

export const metadata: Metadata = { title: "Health", robots: { index: false } };

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

function Meter({ label, used, limit, show }: { label: string; used: number; limit: number; show: (n: number) => string }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 80 ? "bg-danger" : pct >= 50 ? "bg-amber-500" : "bg-brand";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="shrink-0 text-muted">{show(used)} of {show(limit)} ({pct}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

async function Health() {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const [usage, errors] = await Promise.all([getUsage(), listErrors()]);
  const open = errors.filter((e) => !e.resolved);
  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-3 p-4">
        <h2 className="font-bold">Free-plan usage</h2>
        <Meter label="Database (Supabase)" used={usage.databaseBytes} limit={FREE_LIMITS.databaseBytes} show={mb} />
        <Meter label="File storage (photos, avatars)" used={usage.storageBytes} limit={FREE_LIMITS.storageBytes} show={mb} />
        <Meter label="Photo safety checks this month (Google Vision)" used={usage.photosChecked} limit={FREE_LIMITS.visionPerMonth} show={(n) => n.toLocaleString("en-US")} />
        <p className="text-meta text-muted">
          {usage.accounts} accounts. Photo checks count post and message photos (profile pictures add a few more). Past 1,000 a month, Vision costs
          about $1.50 per 1,000. Vercel&apos;s usage is on its own dashboard.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Errors ({open.length} new)</h2>
        <p className="text-meta text-muted">
          Problems people hit on the live site. Repeats are counted on one line. &ldquo;Handled&rdquo; hides one until it happens again.
        </p>
        {errors.length === 0 ? (
          <p className="text-sm text-muted">No errors recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {errors.map((e) => (
              <li key={e.id} className={`card flex flex-col gap-1 p-3 text-sm ${e.resolved ? "opacity-60" : ""}`}>
                <p className="break-words font-mono text-xs">{e.message}</p>
                <p className="text-meta text-muted">
                  {e.source === "server" ? "Server" : "Browser"} · {e.path ?? "unknown page"} · {e.count}× · last {<LocalTime iso={e.lastSeen} style="dateTime" />}
                  {e.digest && ` · code ${e.digest}`}
                </p>
                {!e.resolved && (
                  <form action={resolveError.bind(null, e.id)}>
                    <button className="btn btn-sm btn-ghost">Handled</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function HealthPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <AdminTabs active="health" />
      <Suspense fallback={<CardListSkeleton />}>
        <Health />
      </Suspense>
    </section>
  );
}
