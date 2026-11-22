// The online ladder: ranked netplay for members, one ladder per game in 3-month seasons. Find a match,
// play a best of 3, report it, climb. Standings are public; finding a match needs an account.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import FindMatch from "@/components/ladder/FindMatch";
import Avatar from "@/components/ui/Avatar";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import LocalTime from "@/components/ui/LocalTime";
import { GAMES } from "@/lib/games";
import { isLadderGame, LADDER_GAMES, MIN_MATCHES, previousSeason, seasonEnds, seasonOf, START_RATING, type LadderGame } from "@/lib/ladder";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { seasonLabel } from "./seasonLabel";
import { getLadderState, getMyRating, getStandings, waitingCounts } from "@/lib/ladderData";
import { isRegion, regionName } from "@/lib/regions";
import { pageMeta } from "@/lib/siteMeta";
import { createClient, getUserId } from "@/lib/supabase/server";
import { hasBirthday } from "@/lib/viewer";
import AddBirthday from "@/components/AddBirthday";

export const metadata: Metadata = pageMeta("Ladder", "Ranked netplay on Smashy: find a match, play a best of 3, report it and climb your game's ladder this season.");

type SP = PageProps<"/ladder">["searchParams"];

async function Content({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  await connection(); // seasons follow the clock, so this is worked out per visit
  const game: LadderGame = isLadderGame(sp.game) ? sp.game : "melee";
  const now = new Date();
  const current = seasonOf(now);
  const last = previousSeason(current)!;
  const season = sp.season === last ? last : current;
  const userId = await getUserId();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const seasonName = (s: string) => seasonLabel(s, t);
  let myRegion: string | null = null;
  if (userId) {
    const { data } = await (await createClient()).from("profiles").select("region").eq("id", userId).maybeSingle();
    myRegion = (data as { region: string | null } | null)?.region ?? null;
  }
  const region = sp.region === "mine" ? myRegion : isRegion(sp.region) ? sp.region : null;
  const [standings, state, mine, waiting, birthday] = await Promise.all([
    getStandings(season, game, region),
    userId ? getLadderState(userId) : Promise.resolve(null),
    userId ? getMyRating(current, game, userId) : Promise.resolve(null),
    waitingCounts(),
    hasBirthday(userId),
  ]);
  const link = (o: { game?: LadderGame; region?: string | null; season?: string }) => {
    const p = new URLSearchParams();
    p.set("game", o.game ?? game);
    const r = o.region === undefined ? (region ? (sp.region === "mine" ? "mine" : region) : null) : o.region;
    if (r) p.set("region", r);
    const s = o.season ?? season;
    if (s !== current) p.set("season", s);
    return `/ladder?${p}`;
  };
  const ends = seasonEnds(current);
  const othersWaiting = (waiting[game] ?? 0) - (state?.queue?.game === game ? 1 : 0);

  return (
    <LangProvider lang={lang}>
      {!birthday && (
        <div className="mb-3">
          <AddBirthday currentYear={now.getFullYear()} next={link({})} title={t("people.birthday.toMessageTitle")} body={t("people.birthday.toMessageBody")} />
        </div>
      )}
      <nav aria-label={t("play.ladder.games")} className="flex flex-wrap gap-2">
        {LADDER_GAMES.map((g) => (
          <Link key={g} href={link({ game: g })} aria-current={g === game ? "page" : undefined} className="chip">
            {GAMES[g].short}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="play-heading" className="card flex flex-col gap-3 p-4">
        <h2 id="play-heading" className="font-bold">{t("play.ladder.playTitle")}</h2>
        {!userId ? (
          <p className="text-sm">
            <Link href="/signin?next=/ladder" className="link">{t("play.ladder.joinLink")}</Link> {t("play.ladder.joinAfter")}
          </p>
        ) : state?.activeMatchId ? (
          <p className="text-sm">
            {t("play.ladder.inMatch")} <Link href={`/ladder/match/${state.activeMatchId}`} className="btn btn-sm btn-primary ml-1">{t("play.ladder.openMatch")}</Link>
          </p>
        ) : state?.queue && state.queue.game !== game ? (
          <p className="text-sm">
            {t("play.ladder.lookingFor", { game: GAMES[state.queue.game].short })} <Link href={link({ game: state.queue.game as LadderGame })} className="link">{t("play.ladder.goToIt")}</Link>
          </p>
        ) : (
          <FindMatch game={game} queuedCode={state?.queue?.game === game ? state.queue.connect : null} others={Math.max(0, othersWaiting)} />
        )}
        {mine && (
          <p className="text-meta text-muted">
            {t("play.ladder.youThisSeason")} <b className="text-foreground">{mine.rating}</b> · {mine.wins}–{mine.losses}
            {mine.wins + mine.losses < MIN_MATCHES ? ` · ${t("play.ladder.moreToShow", { n: MIN_MATCHES - mine.wins - mine.losses })}` : ""}
          </p>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-brand">{t("play.ladder.how")}</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
            <li>{t("play.ladder.how1")}</li>
            <li>{t("play.ladder.how2")}</li>
            <li>{t("play.ladder.how3", { rating: START_RATING })}</li>
            <li>{t("play.ladder.how4", { season: seasonName(current) })} {ends ? <LocalTime iso={ends.toISOString()} style="date" /> : t("play.ladder.soon")}{t("common.period")}</li>
          </ul>
        </details>
      </section>

      <section aria-labelledby="standings-heading" className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="standings-heading" className="font-bold">
            {t("play.ladder.standings", { game: GAMES[game].short, season: seasonName(season) })}
          </h2>
          <Link href={link({ season: season === current ? last : current })} className="text-meta text-muted hover:text-foreground">
            {season === current ? t("play.ladder.lastSeason", { season: seasonName(last) }) : t("play.ladder.thisSeason", { season: seasonName(current) })} →
          </Link>
        </div>
        <nav aria-label={t("play.ladder.region")} className="flex flex-wrap gap-2">
          <Link href={link({ region: null })} aria-current={!region ? "page" : undefined} className="chip">{t("play.ladder.everywhere")}</Link>
          {myRegion && (
            <Link href={link({ region: "mine" })} aria-current={region && region === myRegion ? "page" : undefined} className="chip">
              {regionName(myRegion)}
            </Link>
          )}
          {region && region !== myRegion && <span aria-current="page" className="chip">{regionName(region)}</span>}
        </nav>
        {standings.rows.length ? (
          <ol className="flex flex-col divide-y divide-line">
            {standings.rows.slice(0, 100).map((r) => (
              <li key={r.userId} className={`flex items-center gap-3 py-2 ${r.userId === userId ? "font-semibold" : ""}`}>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums text-muted">{r.rank}</span>
                <Avatar name={r.person.tag} src={r.person.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <Link href={`/u/${r.person.handle}`} className="block truncate hover:underline">{r.person.tag}</Link>
                  {!region && r.person.region && <span className="block truncate text-meta text-muted">{regionName(r.person.region)}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono font-bold tabular-nums">{r.rating}</span>
                  <span className="block font-mono text-meta tabular-nums text-muted">{r.wins}–{r.losses}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted">
            {region
              ? t("play.ladder.nobodyIn", { n: MIN_MATCHES, game: GAMES[game].short, region: regionName(region) })
              : t("play.ladder.nobody", { n: MIN_MATCHES, game: GAMES[game].short })}{" "}
            {season === current ? t("play.ladder.beFirst") : ""}
          </p>
        )}
        <p className="text-meta text-muted">{t("play.ladder.showUpAfter", { n: MIN_MATCHES })}</p>
      </section>

      {state && state.recent.length > 0 && (
        <section aria-labelledby="recent-heading" className="card flex flex-col gap-2 p-4">
          <h2 id="recent-heading" className="font-bold">{t("play.ladder.recent")}</h2>
          <ul className="flex flex-col divide-y divide-line">
            {state.recent.map((m) => (
              <li key={m.id}>
                <Link href={`/ladder/match/${m.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:underline">
                  <span className="min-w-0 truncate">
                    {t("play.ladder.vs", { name: m.opp.person.tag })} <span className="text-muted">· {GAMES[m.game].short}</span>
                  </span>
                  <span className="shrink-0 text-muted">
                    {m.status === "confirmed" ? (
                      <>
                        <span className="font-mono tabular-nums">{m.me.score}–{m.opp.score}</span>
                        {m.me.change !== null ? ` · ${m.me.change >= 0 ? "+" : ""}${m.me.change}` : t("play.ladder.didntCount")}
                      </>
                    ) : m.status === "cancelled" ? t("play.ladder.calledOff") : t("play.ladder.noScore")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </LangProvider>
  );
}

export default function LadderPage(props: PageProps<"/ladder">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-bold"><T k="play.ladder.title" /></h1>
        <p className="text-sm text-muted"><T k="play.ladder.intro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={4} />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
