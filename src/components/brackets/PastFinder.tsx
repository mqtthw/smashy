// Past tournaments (round 794; on the Brackets page since round 854, Matthew: "Open any bracket" and
// "Past tournaments" were redundant as separate pages): find finished start.gg tournaments by region, name, game, year and size,
// newest or biggest first. A 2016 r/smashbros request start.gg never fully answered ("a list of European
// tournaments that ran Project M and had 100+ entrants"). start.gg can't sort or filter by size, so the
// newest few hundred matches are read (lib/startgg.ts searchPastTournaments) and filtered here; guests'
// searches count toward the same limit as player lookups.
import Link from "next/link";
import { connection } from "next/server";
import { formatEventDate } from "@/lib/format";
import { GAME_KEYS, GAMES } from "@/lib/games";
import { guestLookup } from "@/lib/guestLookup";
import { getLang, getT } from "@/lib/i18n/server";
import { FIRST_PAST_YEAR, MIN_ENTRANTS, biggestBracket, canSearch, pastRows, readPastQuery } from "@/lib/pastTournaments";
import { REGIONS, regionName } from "@/lib/regions";
import { PAST_SEARCH_MAX, searchPastTournaments } from "@/lib/startgg";
import { getUserId } from "@/lib/supabase/server";
import { getViewerRegion } from "@/lib/viewerRegion";

const GROUPS = ["United States", "Canada", "Countries"] as const;

export default async function PastFinder({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await connection(); // the year list ends at this year
  const thisYear = new Date().getUTCFullYear();
  const q = readPastQuery(sp, thisYear);
  const asked = Object.keys(sp).length > 0;
  const [t, lang, userId] = await Promise.all([getT(), getLang(), getUserId()]);
  // Before the first search, the form starts on the visitor's own region.
  const region = asked ? q.region : await getViewerRegion(userId);
  const years = Array.from({ length: thisYear - FIRST_PAST_YEAR + 1 }, (_, i) => thisYear - i);

  let found: { tournaments: ReturnType<typeof pastRows>; total: number; read: number } | null = null;
  let problem: "needs" | "limit" | "failed" | null = null;
  if (asked && !canSearch(q)) problem = "needs";
  else if (asked) {
    const gate = userId ? "ok" : await guestLookup();
    if (gate !== "ok") problem = "limit";
    else {
      const res = await searchPastTournaments({ region: q.region, name: q.name, game: q.game, year: q.year }).catch((e) => {
        console.error("Past tournament search failed", e instanceof Error ? e.message : e);
        return null;
      });
      if (!res) problem = "failed";
      else found = { tournaments: pastRows(res.tournaments, q), total: res.total, read: res.read };
    }
  }

  return (
    <section aria-labelledby="past-tournaments" className="flex flex-col gap-4">
      <h2 id="past-tournaments" className="font-bold">{t("browse.past.title")}</h2>
      <p className="-mt-2 text-sm text-muted">{t("browse.past.intro")}</p>

      <form method="get" action="/brackets#past-tournaments" className="card grid grid-cols-1 gap-3 p-4 text-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          {t("browse.past.name")}
          <input name="q" defaultValue={q.name ?? ""} maxLength={60} placeholder={t("browse.past.namePlaceholder")} className="field" />
        </label>
        <label className="flex flex-col gap-1">
          {t("browse.past.region")}
          <select name="region" defaultValue={region ?? ""} className="field">
            <option value="">{t("browse.past.anywhere")}</option>
            {GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {REGIONS.filter((r) => r.group === g).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t("browse.past.game")}
          <select name="game" defaultValue={q.game ?? ""} className="field">
            <option value="">{t("browse.past.allGames")}</option>
            {GAME_KEYS.map((k) => <option key={k} value={k}>{GAMES[k].short}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t("browse.past.year")}
          <select name="year" defaultValue={q.year ?? ""} className="field">
            <option value="">{t("browse.past.anyYear")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t("browse.past.min")}
          <select name="min" defaultValue={q.min} className="field">
            {MIN_ENTRANTS.map((n) => <option key={n} value={n}>{n ? t("browse.past.minN", { n }) : t("browse.past.anySize")}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t("browse.past.sort")}
          <select name="sort" defaultValue={q.sort} className="field">
            <option value="newest">{t("browse.past.newest")}</option>
            <option value="biggest">{t("browse.past.biggest")}</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn btn-md btn-primary w-full">{t("browse.past.search")}</button>
        </div>
      </form>

      {problem === "needs" && <p className="card p-4 text-sm text-muted">{t("browse.past.needs")}</p>}
      {problem === "limit" && (
        <p className="card p-4 text-sm text-muted">
          {t("browse.past.limit")} <Link href={`/signin?next=${encodeURIComponent("/brackets")}`} className="link">{t("browse.past.signIn")}</Link>
        </p>
      )}
      {problem === "failed" && <p className="card p-4 text-sm text-muted">{t("browse.past.failed")}</p>}

      {found && (
        <section aria-labelledby="past-results" className="flex flex-col gap-2">
          <h2 id="past-results" className="font-bold">{t("browse.past.results", { n: found.tournaments.length })}</h2>
          {found.total > found.read && (
            <p className="text-meta text-muted">{t("browse.past.partial", { read: found.read, total: found.total, max: PAST_SEARCH_MAX })}</p>
          )}
          {found.tournaments.length === 0 ? (
            <p className="card p-4 text-sm text-muted">{t("browse.past.none")}</p>
          ) : (
            <ul className="card divide-y divide-line text-sm">
              {found.tournaments.map((tour) => {
                const events = tour.events.filter((e) => !q.game || e.game === q.game).sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0));
                const where = [tour.city, tour.region ? regionName(tour.region) : null].filter(Boolean).join(", ");
                return (
                  <li key={tour.id}>
                    <Link href={`/events/${tour.slug}`} className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-surface">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">{tour.name}</span>
                        <span className="shrink-0 tabular-nums text-muted">{t("browse.past.entrants", { n: biggestBracket(tour, q.game) })}</span>
                      </span>
                      <span className="text-meta text-muted">
                        {formatEventDate(tour.startAt, tour.timezone, lang, { year: true })}
                        {where && ` · ${where}`}
                        {" · "}
                        {events.slice(0, 3).map((e) => `${e.name} (${e.numEntrants ?? 0})`).join(" · ")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      <p className="text-meta text-muted">{t("browse.past.source")}</p>
    </section>
  );
}
