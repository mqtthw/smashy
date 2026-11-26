// Add a top 8 VOD to a major in Smash history: from a year's page (pick the major) or a major's own page
// (picked already). An admin's shows right away; a member's waits for review.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { getMajor, getPastMajors, HISTORY_FIRST_YEAR } from "@/lib/majors";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import VodForm, { type VodMajorOption } from "./VodForm";

export const metadata: Metadata = pageMeta("Add a top 8 VOD", "Add a top 8 VOD to a major in Smash history on Smashy.", { robots: { index: false } });

async function AddVod({ searchParams }: { searchParams: PageProps<"/history/vod">["searchParams"] }) {
  const sp = await searchParams;
  await connection();
  const t = await getT();
  const majorSlug = typeof sp.major === "string" ? sp.major : null;
  const major = majorSlug ? await getMajor(majorSlug).catch(() => null) : null;
  const asked = Number(sp.year);
  const thisYear = new Date().getUTCFullYear();
  const year = major ? new Date(major.startAt).getUTCFullYear() : Number.isInteger(asked) && asked >= HISTORY_FIRST_YEAR && asked <= thisYear ? asked : thisYear;
  if (!(await getUserId())) {
    const back = `/history/vod?${major ? `major=${encodeURIComponent(major.slug)}` : `year=${year}`}`;
    return <Link href={`/signin?next=${encodeURIComponent(back)}`} className="btn btn-md btn-primary self-start">{t("history.vod.signIn")}</Link>;
  }
  const majors: VodMajorOption[] = (await getPastMajors(year).catch(() => [])).map((m) => ({ slug: m.slug, name: m.name, games: m.games }));
  if (major && !majors.some((m) => m.slug === major.slug)) majors.unshift({ slug: major.slug, name: major.name, games: major.games });
  return (
    <>
      <p className="text-sm text-muted">
        {t("history.report.forYear", { year })} <Link href={`/history?year=${year}`} className="link">{t("history.report.backToYear", { year })}</Link>
      </p>
      {majors.length ? <VodForm majors={majors} selected={major?.slug ?? null} /> : <p className="card p-4 text-sm text-muted">{t("history.none", { year })}</p>}
    </>
  );
}

export default function AddVodPage(props: PageProps<"/history/vod">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/history" className="text-sm text-muted hover:text-foreground"><T k="history.major.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.vod.title" /></h1>
        <p className="text-sm text-muted"><T k="history.vod.intro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <AddVod searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
