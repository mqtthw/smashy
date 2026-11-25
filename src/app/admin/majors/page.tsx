import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import GameBadge from "@/components/GameBadge";
import { GAMES } from "@/lib/games";
import { LiveDot, majorDates, majorPlace } from "@/components/majors/MajorParts";
import { MAJOR_THRESHOLDS, getMajorsForAdmin, searchPastMajorsForAdmin } from "@/lib/majors";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { isManualMajor, listHandMajors, MANUAL_PREFIX, majorHref } from "@/lib/handMajors";
import { getPendingSuggestions } from "@/lib/majorSuggestions";
import { getMomentsForAdmin, type Moment } from "@/lib/historyMoments";
import { getOpenReports } from "@/lib/historyReports";
import { getMajorVodsForAdmin } from "@/lib/majorVods";
import AddMomentForm from "./AddMomentForm";
import { removeHandMajor, resolveReportAction, reviewMajorVodAction, rescanMajors, reviewMajorSuggestion, reviewMomentAction, toggleMajorHidden } from "../actions";
import AddHandMajorForm from "./AddHandMajorForm";
import AddMajorForm from "./AddMajorForm";
import { CardListSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Majors", robots: { index: false } };

async function MajorsAdmin({ searchParams }: { searchParams: PageProps<"/admin/majors">["searchParams"] }) {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const sp = await searchParams;
  const pastQ = typeof sp.past === "string" ? sp.past : "";
  const pastYear = typeof sp.year === "string" && /^\d{4}$/.test(sp.year) ? Number(sp.year) : null;
  const searching = !!pastQ.trim() || pastYear !== null;
  const [majors, hand, suggestions, past, moments, reports, vods] = await Promise.all([
    getMajorsForAdmin(),
    listHandMajors(),
    getPendingSuggestions(),
    searching ? searchPastMajorsForAdmin(pastQ, pastYear) : Promise.resolve([]),
    getMomentsForAdmin(),
    getOpenReports(),
    getMajorVodsForAdmin(),
  ]);
  const momentRow = (m: Moment, buttons: React.ReactNode) => (
    <li key={m.id} className="card flex flex-col gap-1 p-3 text-sm">
      <p className="text-meta text-muted">
        {m.day}
        {m.game ? ` · ${GAMES[m.game].short}` : ""}
        {m.suggestedBy ? ` · suggested by @${m.suggestedBy}` : ""}
      </p>
      <p className="font-semibold">{m.title}</p>
      {m.note && <p className="text-muted">{m.note}</p>}
      <a href={m.link} target="_blank" rel="noopener noreferrer" className="break-all text-brand">{m.link} ↗︎</a>
      <div className="mt-1 flex gap-2">{buttons}</div>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active="majors" />

      <section className="flex flex-col gap-2 text-sm">
        <p className="text-muted">
          Smashy checks start.gg and parry.gg every 6 hours. A tournament counts as a major when one in-person bracket reaches{" "}
          {MAJOR_THRESHOLDS.melee} Melee, {MAJOR_THRESHOLDS.ultimate} Ultimate or {MAJOR_THRESHOLDS.pplus} P+ entrants, or start.gg
          staff-picks it, or parry.gg features it on its home page with 32+ in one of our games. Add any other tournament below, or hide one.
        </p>
        <AddMajorForm />
        <form action={rescanMajors}>
          <button className="btn btn-sm btn-ghost">Check start.gg and parry.gg now (takes about a minute)</button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Current and upcoming ({majors.length})</h2>
        {majors.length === 0 && <p className="text-sm text-muted">None yet. The first check fills this in.</p>}
        <ul className="flex flex-col gap-2">
          {majors.map((m) => (
            <li key={m.slug} className={`card flex items-center gap-3 p-3 text-sm ${m.hidden ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.live && <LiveDot />}
                  {m.games.map((g) => <GameBadge key={g} game={g} />)}
                  {m.source === "admin" && <span className="badge bg-surface-2 text-muted">Added by admin</span>}
                  {m.hidden && <span className="badge bg-surface-2 text-muted">Hidden</span>}
                </div>
                <Link href={`/events/${m.slug}`} className="mt-1 block truncate font-semibold hover:underline">{m.name}</Link>
                <p className="truncate text-meta text-muted">
                  {[majorDates(m), majorPlace(m), m.entrants ? `${m.entrants} entrants` : null, m.stream ? `stream: ${m.stream.name}` : "no stream listed"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <form action={toggleMajorHidden.bind(null, m.slug, !m.hidden)}>
                <button className={`btn btn-sm ${m.hidden ? "btn-outline" : "btn-danger"}`}>{m.hidden ? "Show" : "Hide"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Smash history: top 8 VODs ({vods.pending.length} waiting)</h2>
        <p className="text-sm text-muted">
          Members&apos; VOD links for a major&apos;s game. To add one yourself, use &quot;Add a top 8 VOD&quot; on Smash history (yours show right away).
        </p>
        {[...vods.pending.map((v) => ({ v, waiting: true })), ...vods.recent.map((v) => ({ v, waiting: false }))].map(({ v, waiting }) => (
          <div key={v.id} className="card flex flex-col gap-1 p-3 text-sm">
            <p className="text-meta text-muted">
              {waiting ? "Waiting" : "Showing"} · {v.majorName} · {GAMES[v.game].short}
              {v.by ? ` · suggested by @${v.by}` : ""}
            </p>
            <a href={v.url} target="_blank" rel="noopener noreferrer" className="break-all text-brand">{v.label ? `${v.label}: ` : ""}{v.url} ↗︎</a>
            <div className="mt-1 flex gap-2">
              {waiting && <form action={reviewMajorVodAction.bind(null, v.id, true)}><button className="btn btn-sm btn-primary">Approve</button></form>}
              <form action={reviewMajorVodAction.bind(null, v.id, false)}><button className={`btn btn-sm ${waiting ? "btn-outline" : "btn-danger"}`}>{waiting ? "Reject" : "Take down"}</button></form>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Smash history: reported mistakes ({reports.length})</h2>
        <p className="text-sm text-muted">Members&apos; reports of a wrong major or moment. Fix it (edit or hide it), then mark it done.</p>
        {reports.length === 0 && <p className="text-sm text-muted">Nothing reported.</p>}
        <ul className="flex flex-col gap-2">
          {reports.map((r) => (
            <li key={r.id} className="card flex flex-col gap-1 p-3 text-sm">
              <p className="text-meta text-muted">{r.by ? `@${r.by}` : "A member"} · {r.createdAt.slice(0, 10)}</p>
              {r.major && (
                <p>
                  Major: <Link href={majorHref(r.major.slug)} className="font-semibold hover:underline">{r.major.name}</Link>
                  {r.major.hidden ? " (hidden)" : ""}
                </p>
              )}
              {r.moment && (
                <p>
                  Moment: <span className="font-semibold">{r.moment.day}: {r.moment.title}</span>
                  {r.moment.status !== "approved" ? " (taken down)" : ""}
                </p>
              )}
              <p>“{r.message}”</p>
              {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" className="break-all text-brand">{r.link} ↗︎</a>}
              <div className="mt-1 flex flex-wrap gap-2">
                {r.major && isManualMajor(r.major.slug) && (
                  <Link href={`/admin/majors/edit/${r.major.slug.slice(MANUAL_PREFIX.length)}`} className="btn btn-sm btn-outline">Edit the major</Link>
                )}
                {r.major && !r.major.hidden && (
                  <form action={toggleMajorHidden.bind(null, r.major.slug, true)}><button className="btn btn-sm btn-danger">Hide the major</button></form>
                )}
                {r.moment && r.moment.status === "approved" && (
                  <form action={reviewMomentAction.bind(null, r.moment.id, false)}><button className="btn btn-sm btn-danger">Take down the moment</button></form>
                )}
                <form action={resolveReportAction.bind(null, r.id)}><button className="btn btn-sm btn-outline">Done</button></form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Smash history: find a past major</h2>
        <p className="text-sm"><Link href="/admin/majors/players" className="underline">One player across tags →</Link> (link names in older results to start.gg players)</p>
        <p className="text-sm text-muted">Hide a wrong or duplicate major from Smash history (and player pages), or show it again.</p>
        <form className="flex flex-wrap gap-2" action="/admin/majors">
          <label htmlFor="past-q" className="sr-only">Name</label>
          <input id="past-q" name="past" defaultValue={pastQ} placeholder="Name, e.g. Genesis" className="field min-w-0 flex-1" />
          <label htmlFor="past-year" className="sr-only">Year</label>
          <input id="past-year" name="year" defaultValue={pastYear ?? ""} inputMode="numeric" placeholder="Year" className="field w-24" />
          <button className="btn btn-md btn-outline">Find</button>
        </form>
        {searching && past.length === 0 && <p className="text-sm text-muted">No past majors match.</p>}
        {past.length > 0 && (
          <ul className="flex flex-col gap-2">
            {past.map((m) => (
              <li key={m.slug} className={`card flex items-center gap-3 p-3 text-sm ${m.hidden ? "opacity-60" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.games.map((g) => <GameBadge key={g} game={g} />)}
                    {m.source !== "auto" && <span className="badge bg-surface-2 text-muted">{m.source === "manual" ? "Added by hand" : "Added by admin"}</span>}
                    {m.hidden && <span className="badge bg-surface-2 text-muted">Hidden</span>}
                  </div>
                  <Link href={majorHref(m.slug)} className="mt-1 block truncate font-semibold hover:underline">{m.name}</Link>
                  <p className="truncate text-meta text-muted">
                    {[`${majorDates(m)}, ${new Date(m.startAt).getUTCFullYear()}`, majorPlace(m), m.entrants ? `${m.entrants} entrants` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <form action={toggleMajorHidden.bind(null, m.slug, !m.hidden)}>
                  <button className={`btn btn-sm ${m.hidden ? "btn-outline" : "btn-danger"}`}>{m.hidden ? "Show" : "Hide"}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Smash history: suggested by members ({suggestions.length})</h2>
        <p className="text-sm text-muted">
          Approve adds the major (a link: as if you pasted it above; before 2017: as typed, with its source) and credits the member on
          its page. Check the source first: names and placements only.
        </p>
        {suggestions.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <li key={s.id} className="card flex flex-col gap-2 p-3 text-sm">
              <p className="text-meta text-muted">
                {s.by?.handle ? `@${s.by.handle}` : "A member"} · {s.createdAt.slice(0, 10)} · {s.kind === "link" ? "Link" : "Before 2017, typed in"}
              </p>
              {s.kind === "link" && s.link && (
                <a href={s.link} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-brand">{s.link} ↗︎</a>
              )}
              {s.kind === "manual" && s.details && (
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">
                    {s.details.name} · {s.details.start}
                    {s.details.end ? ` to ${s.details.end}` : ""}
                    {s.details.city ? ` · ${s.details.city}` : ""}
                    {s.details.country ? ` · ${s.details.country}` : ""}
                  </p>
                  <a href={s.details.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand">Source: {s.details.sourceUrl} ↗︎</a>
                  {s.details.games.filter((g) => g.game || g.top8.trim()).map((g, i) => (
                    <div key={i} className="rounded-lg bg-surface p-2">
                      <p className="font-semibold">{g.eventName || g.game}{g.entrants ? ` · ${g.entrants} entrants` : ""}</p>
                      <pre className="whitespace-pre-wrap font-sans">{g.top8}</pre>
                    </div>
                  ))}
                </div>
              )}
              {s.note && <p className="italic text-muted">“{s.note}”</p>}
              <div className="flex gap-2">
                <form action={reviewMajorSuggestion.bind(null, s.id, true)}><button className="btn btn-sm btn-primary">Approve</button></form>
                <form action={reviewMajorSuggestion.bind(null, s.id, false)}><button className="btn btn-sm btn-outline">Reject</button></form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Smash history: moments ({moments.pending.length} waiting)</h2>
        <p className="text-sm text-muted">
          Dated moments on each year of <Link href="/history" className="underline">Smash history</Link> and on the{" "}
          <Link href="/history/timeline" className="underline">timeline</Link>. Plain facts in our own words, with a VOD or source link;
          no verdicts (&quot;best&quot;, &quot;greatest upset&quot;).
        </p>
        <AddMomentForm />
        {moments.pending.length > 0 && (
          <ul className="flex flex-col gap-2">
            {moments.pending.map((m) =>
              momentRow(m, (
                <>
                  <form action={reviewMomentAction.bind(null, m.id, true)}><button className="btn btn-sm btn-primary">Approve</button></form>
                  <form action={reviewMomentAction.bind(null, m.id, false)}><button className="btn btn-sm btn-outline">Reject</button></form>
                </>
              )),
            )}
          </ul>
        )}
        {moments.recent.length > 0 && (
          <>
            <h3 className="font-semibold">Latest on the timeline</h3>
            <ul className="flex flex-col gap-2">
              {moments.recent.map((m) =>
                momentRow(m, <form action={reviewMomentAction.bind(null, m.id, false)}><button className="btn btn-sm btn-danger">Take down</button></form>),
              )}
            </ul>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Smash history: majors before start.gg ({hand.length})</h2>
        <p className="text-sm text-muted">
          start.gg&apos;s results start in 2017. Add older majors (1999 to 2016) here, from a source you link. They show on{" "}
          <Link href="/history" className="underline">Smash history</Link> under their year.
        </p>
        <AddHandMajorForm />
        {hand.length > 0 && (
          <ul className="flex flex-col gap-2">
            {hand.map((m) => (
              <li key={m.slug} className="card flex items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5">{m.games.map((g) => <GameBadge key={g} game={g} />)}</div>
                  <Link href={majorHref(m.slug)} className="mt-1 block truncate font-semibold hover:underline">{m.name}</Link>
                  <p className="text-meta text-muted">{m.startAt.slice(0, 10)}</p>
                </div>
                <Link href={`/admin/majors/edit/${m.slug.slice(MANUAL_PREFIX.length)}`} className="btn btn-sm btn-outline">Edit</Link>
                <form action={removeHandMajor.bind(null, m.slug)}>
                  <button className="btn btn-sm btn-danger">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminMajorsPage(props: PageProps<"/admin/majors">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <MajorsAdmin searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
