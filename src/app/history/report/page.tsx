// Report a mistake in Smash history (docs/archive-plan.md, step A4 part 2): a major or a moment from one
// year, picked from a list (or the major the link came from), what's wrong, and a source if there is one.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { getMoments, type Moment } from "@/lib/historyMoments";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { GAMES, isGameKey } from "@/lib/games";
import { getMajor, getPastMajors } from "@/lib/majors";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import ReportForm, { type ReportOption } from "./ReportForm";

export const metadata: Metadata = pageMeta("Report a mistake", "Report a mistake in Smash history on Smashy.", { robots: { index: false } });

async function Report({ searchParams }: { searchParams: PageProps<"/history/report">["searchParams"] }) {
  const sp = await searchParams;
  await connection();
  const t = await getT();
  const userId = await getUserId();
  const majorSlug = typeof sp.major === "string" ? sp.major : null;
  // "Fill in this top 8" (from a major's page): a place-by-place template for that game.
  const fillGame = isGameKey(sp.fill) ? sp.fill : null;
  const fill = fillGame ? [t("history.report.fillIntro", { game: GAMES[fillGame].short }), ...[1, 2, 3, 4, 5, 5, 7, 7].map((p) => `${p} `)].join("\n") : null;
  const major = majorSlug ? await getMajor(majorSlug).catch(() => null) : null;
  const askedYear = Number(sp.year);
  const thisYear = new Date().getUTCFullYear();
  const year = major ? new Date(major.startAt).getUTCFullYear() : Number.isInteger(askedYear) && askedYear >= 1999 && askedYear <= thisYear ? askedYear : thisYear;
  const back = `/history?year=${year}`;
  if (!userId) {
    return (
      <Link href={`/signin?next=${encodeURIComponent(`/history/report?${major ? `major=${encodeURIComponent(major.slug)}${fillGame ? `&fill=${fillGame}` : ""}` : `year=${year}`}`)}`} className="btn btn-md btn-primary self-start">
        {t("history.report.signIn")}
      </Link>
    );
  }
  const [majors, moments] = await Promise.all([getPastMajors(year).catch(() => []), getMoments(year).catch((): Moment[] => [])]);
  const options: ReportOption[] = [
    ...majors.map((m) => ({ value: `major:${m.slug}`, label: m.name, group: "majors" as const })),
    ...moments.map((m) => ({ value: `moment:${m.id}`, label: `${m.day}: ${m.title}`, group: "moments" as const })),
  ];
  if (major && !options.some((o) => o.value === `major:${major.slug}`)) options.unshift({ value: `major:${major.slug}`, label: major.name, group: "majors" });
  return (
    <>
      <p className="text-sm text-muted">{t("history.report.forYear", { year })} <Link href={back} className="link">{t("history.report.backToYear", { year })}</Link></p>
      {options.length ? (
        <ReportForm options={options} selected={major ? `major:${major.slug}` : null} fill={fill} />
      ) : (
        <p className="card p-4 text-sm text-muted">{t("history.none", { year })}</p>
      )}
    </>
  );
}

export default function ReportPage(props: PageProps<"/history/report">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/history" className="text-sm text-muted hover:text-foreground"><T k="history.major.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.report.title" /></h1>
        <p className="text-sm text-muted"><T k="history.report.intro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Report searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
