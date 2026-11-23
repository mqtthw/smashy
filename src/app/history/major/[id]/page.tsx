// A major from before start.gg, added to Smash history by hand (docs/archive-plan.md, step A3): its
// dates, place, each game's top 8 and a link to where the results come from. Facts only.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import GameBadge from "@/components/GameBadge";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import NewTab from "@/components/ui/NewTab";
import { GAMES } from "@/lib/games";
import { getHandMajor } from "@/lib/handMajors";
import { liquipediaSearch } from "@/lib/liquipedia";
import { T } from "@/lib/i18n/client";
import { placeKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";
import { getMajorEvents } from "@/lib/majorEvents";
import { getMajorVods, type MajorVod } from "@/lib/majorVods";
import VodLinks from "@/components/history/VodLinks";
import FullStandings, { visibleStandings } from "@/components/history/FullStandings";
import { getMajorStandings, type StandingRow } from "@/lib/majorStandings";
import CharacterStocks from "@/components/history/CharacterStocks";
import { charactersFor, getMajorCharacters, placingId, tagOnly, type MajorCharacters } from "@/lib/majorSets";
import { idForName, nameHref, winBrackets } from "@/lib/historyFirsts";
import { getNameLinks, nameKey } from "@/lib/playerLinks";
import { playersHidingStats } from "@/lib/playerStats";
import { majorDates, majorPlace } from "@/lib/majorText";
import { pageMeta } from "@/lib/siteMeta";

// One read per page view (round 732): the page's title and the page itself ask for the same data, and
// Smashy's time-limited database calls aren't de-duplicated by Next, so each used to run twice.
const majorOnce = cache((id: string) => getHandMajor(id));

export async function generateMetadata({ params }: PageProps<"/history/major/[id]">): Promise<Metadata> {
  const m = await majorOnce((await params).id).catch(() => null);
  if (!m) return { title: "Smash history" };
  const year = new Date(m.startAt).getUTCFullYear();
  return pageMeta(`${m.name} (${year})`, `${m.name}, ${year}: top 8 results in Smash history on Smashy, with a link to their source.`);
}

async function MajorView({ params }: { params: PageProps<"/history/major/[id]">["params"] }) {
  const m = await majorOnce((await params).id);
  if (!m) notFound();
  const [t, lang, saved, vodMap, standings, chars, links] = await Promise.all([
    getT(),
    getLang(),
    getMajorEvents([m.slug]),
    getMajorVods([m.slug]).catch(() => new Map<string, MajorVod[]>()),
    // Full standings (step H3) of brackets matched on start.gg.
    getMajorStandings(m.slug).then(visibleStandings).catch(() => new Map<string, StandingRow[]>()),
    // Characters each top 8 player used (step H5), where start.gg recorded them.
    getMajorCharacters([m.slug]).catch((): MajorCharacters => new Map()),
    getNameLinks().catch(() => new Map<string, string>()),
  ]);
  const vods = vodMap.get(m.slug) ?? [];
  const events = (saved.get(m.slug) ?? []).sort((a, b) => a.eventId.localeCompare(b.eventId));
  const ids = events.flatMap((e) => e.top8.map((r) => placingId(r, links, e.game))).filter((x): x is string => !!x);
  const hidden = chars.size || events.some((e) => e.top8.some((r) => r.characters?.length)) ? await playersHidingStats(ids).catch(() => null) : new Set<string>();
  // Names link to a player's page (start.gg id, admin link, or the one player who placed under that tag in the
  // game), or else to the name's own page; team names stay plain.
  const games = [...new Set(events.map((e) => e.game))];
  const aliases = new Map(await Promise.all(games.map(async (g) => [g, idForName(await winBrackets(g).catch(() => []))] as const)));
  const nameLink = (e: (typeof events)[number], name: string, id: string | null) => {
    if (e.teams) return null;
    const who = id ?? aliases.get(e.game)?.(nameKey(tagOnly(name))) ?? null;
    return who ? `/players/${who}` : nameHref(name);
  };
  const year = new Date(m.startAt).getUTCFullYear();
  const place = majorPlace(m, lang);
  let host: string | null = null;
  try {
    host = m.sourceUrl ? new URL(m.sourceUrl).hostname.replace(/^www\./, "") : null;
  } catch {}

  return (
    <>
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-1.5">{m.games.map((g) => <GameBadge key={g} game={g} />)}</div>
        <h1 className="text-2xl font-bold leading-tight">{m.name}</h1>
        <p className="text-muted">
          {majorDates(m, lang)}, {year}
          {place ? ` · ${place}` : ""}
          {m.entrants ? ` · ${t("browse.entrants", { n: m.entrants })}` : ""}
        </p>
      </header>

      {events.map((e) => (
        <section key={e.eventId} aria-labelledby={`ev-${e.eventId}`} className="card p-4">
          <h2 id={`ev-${e.eventId}`} className="font-bold">
            {e.name}
            <span className="font-normal text-muted">
              {" · "}{GAMES[e.game].short}
              {e.entrants ? ` · ${t("browse.entrants", { n: e.entrants })}` : ""}
            </span>
          </h2>
          <VodLinks vods={vods.filter((v) => v.game === e.game)} t={t} className="mt-1" />
          {e.top8.length < 8 && (
            <Link href={`/history/report?major=${encodeURIComponent(m.slug)}&fill=${e.game}`} className="mt-1 inline-block text-meta underline">
              {t("history.report.fillLink")}
            </Link>
          )}
          {e.top8.length ? (
            <ol className="mt-2 flex flex-col gap-1">
              {e.top8.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-10 shrink-0 text-muted">{t(placeKey(r.place), { n: r.place })}</span>
                  <span className={r.place === 1 ? "font-semibold" : undefined}>
                    {(() => {
                      const href = nameLink(e, r.name, placingId(r, links, e.game));
                      return href ? <Link href={href} className="hover:underline">{r.name}</Link> : r.name;
                    })()}
                  </span>
                  <CharacterStocks game={e.game} names={charactersFor(chars, m.slug, e.eventId, r, links, hidden, e.game)} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-muted">{t("history.major.noTop8")}</p>
          )}
          <FullStandings rows={standings.get(e.eventId)} entrants={e.entrants} t={t} className="mt-2" />
        </section>
      ))}

      <section className="flex flex-col gap-1 text-sm text-muted">
        <p>{t("history.major.handAdded")}</p>
        {m.sourceUrl && host && (
          <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand">
            {t("history.major.source", { host })} ↗<NewTab />
          </a>
        )}
        {/* Placings matched to start.gg players came from start.gg (round 526). */}
        {events.some((e) => e.top8.some((r) => r.playerId)) && <p>{t("history.major.alsoStartgg")}</p>}
        {chars.size > 0 && <p>{t("history.characters.credit")}</p>}
        <a href={liquipediaSearch(m.name)} target="_blank" rel="noopener noreferrer" className="self-start text-brand">
          {t("history.liquipedia")} ↗<NewTab />
        </a>
        {m.suggestedBy && <p>{t("history.major.suggestedBy", { handle: m.suggestedBy })}</p>}
        {m.addedBy && <p>{t("history.major.addedBy", { handle: m.addedBy })}</p>}
        <Link href={`/history/vod?major=${encodeURIComponent(m.slug)}`} className="self-start underline">{t("history.vod.link.major")}</Link>
        <Link href={`/history/report?major=${encodeURIComponent(m.slug)}`} className="self-start underline">{t("history.report.link.major")}</Link>
      </section>
    </>
  );
}

export default function HandMajorPage(props: PageProps<"/history/major/[id]">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Link href="/history" className="text-sm text-muted hover:text-foreground"><T k="history.major.back" /></Link>
      <Suspense fallback={<CardListSkeleton count={3} />}>
        <MajorView params={props.params} />
      </Suspense>
    </section>
  );
}
