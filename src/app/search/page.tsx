import MainBadge from "@/components/MainBadge";
import { searchSeasons } from "@/lib/seasons";
import WhoToFollow from "@/components/discovery/WhoToFollow";
import { getTrendingTags, getWhoToFollow } from "@/lib/discovery";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import PostCard from "@/components/feed/PostCard";
import HighlightCard from "@/components/highlights/HighlightCard";
import { unixNow } from "@/lib/format";
import { parseHashtag } from "@/lib/hashtags";
import { getHighlightsByIds } from "@/lib/highlights";
import { getPostsByIds } from "@/lib/posts";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { characterName } from "@/lib/characters";
import { characterDiscord } from "@/lib/characterDiscords";
import { CHARACTER_LIBRARIES } from "@/lib/essentials";
import { charactersIn, searchLibrary } from "@/lib/librarySearch";
import { characterLabel, findPeople, searchCharacters, searchHighlightIds, searchPeople, searchPostIds, type PersonHit } from "@/lib/search";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";

type Translate = (key: MessageKey, values?: Values) => string;

/** Puts a link (or other node) where "\u0001" sits in a translated sentence. */
function withNode(text: string, node: React.ReactNode) {
  const [before, after = ""] = text.split("\u0001");
  return <>{before}{node}{after}</>;
}

/** A list of people (search results and filters). */
function PeopleList({ people, t }: { people: PersonHit[]; t: Translate }) {
  return (
    <ul className="divide-y divide-line">
      {people.map((p) => (
        <li key={p.handle}>
          <Link href={`/u/${p.handle}`} className="flex items-center gap-3 py-2 hover:bg-surface">
            <Avatar name={p.tag} src={p.avatarUrl} />
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate font-semibold">{p.tag} <MainBadge main={p.main} /></span>
              <span className="block truncate text-xs text-muted">
                @{p.handle}{p.homeCity && ` · ${p.homeCity}`}{p.crew && ` · ${p.crew}`}{p.lfgDoubles && t("people.search.lookingPartner")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
import { getUserId } from "@/lib/supabase/server";
import type { GuestLookup } from "@/lib/guestBudget";
import { guestLookup } from "@/lib/guestLookup";
import { searchSavedPlayers } from "@/lib/playerIndex";
import { byMajors, cleanPlayerQuery, mergePlayerHits, startggProfileSlug, type MajorSummary, type PlayerHit } from "@/lib/playerSearch";
import { getMajorSummaries } from "@/lib/majorEvents";
import { playersHidingStats } from "@/lib/playerStats";
import { regionName } from "@/lib/regions";
import { getStartggPlayerBySlug, searchStartggPlayers } from "@/lib/startggPlayers";
import { getViewerRegion } from "@/lib/viewerRegion";
import GameBadge from "@/components/GameBadge";
import HistoryNameHits from "@/components/history/HistoryNameHits";
import LocalTime from "@/components/ui/LocalTime";
import { getEventWinners, searchHostedEvents } from "@/lib/hostedEvents";
import Avatar from "@/components/ui/Avatar";
import TabBar from "@/components/ui/TabBar";
import { PeopleSkeleton } from "@/components/ui/Skeleton";
import Icon from "@/components/ui/Icon";
import NewTab from "@/components/ui/NewTab";
import { searchMajors } from "@/lib/majors";
import { majorHref } from "@/lib/handMajors";

/** Searches to try on the empty search page (round 842): a character, a nickname, some tech, a tag. */
const SEARCH_EXAMPLES = ["falcon", "puff", "waveshine", "Zain", "#SSBU_CLOUD"];

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.search"), robots: { index: false } };
}

const TABS = [
  { key: "top", label: "people.search.tab.top" },
  { key: "people", label: "people.search.tab.people" },
  { key: "players", label: "people.search.tab.players" },
  { key: "posts", label: "people.search.tab.posts" },
  { key: "resources", label: "people.search.tab.resources" },
  { key: "events", label: "people.search.tab.events" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/** "melee/marth" -> that character, if it's real and has a library. */
function parseScope(value: string) {
  const [game, character] = value.split("/");
  if (!game || !character || !(GAME_KEYS as readonly string[]).includes(game)) return null;
  const g = game as GameKey;
  const name = characterName(g, character);
  return name && CHARACTER_LIBRARIES[g]?.[character] ? { game: g, character, name } : null;
}

function SearchBox({ q, scope, players = false, t }: { q: string; scope?: { value: string; name: string }; players?: boolean; t: Translate }) {
  // A plain GET form: works before JavaScript loads, and every search is a shareable URL.
  return (
    <form action="/search" role="search" className="flex gap-2 px-4 pt-4">
      {scope && <input type="hidden" name="in" value={scope.value} />}
      {players && <input type="hidden" name="tab" value="players" />}
      <input
        name="q"
        defaultValue={q}
        autoFocus={!q}
        maxLength={100}
        placeholder={scope ? t("people.search.scopePlaceholder", { name: scope.name }) : players ? t("people.search.playersPlaceholder") : t("people.search.placeholder")}
        aria-label={t("people.search")}
        className="min-w-0 flex-1 rounded-full border border-line bg-field px-4 py-2"
      />
      <button className="btn btn-md btn-inverse">{t("people.search")}</button>
    </form>
  );
}

/** Before you type: what people are tagging this week, and who to follow. */
async function SearchDiscovery() {
  const userId = await getUserId();
  const [tags, people, t] = await Promise.all([getTrendingTags(10), userId ? getWhoToFollow(userId, 5) : Promise.resolve([]), getT()]);
  return (
    <>
      {tags.length > 0 && (
        <section aria-labelledby="trending" className="flex flex-col gap-2 border-t border-line px-4 py-3">
          <h2 id="trending" className="text-sm font-bold">{t("people.search.trending")}</h2>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tg) => {
              const p = parseHashtag(tg.tag);
              const href = p.game && p.character ? `/games/${p.game}/${p.character}` : `/tags/${encodeURIComponent(p.raw.toLowerCase())}`;
              return (
                <li key={tg.tag}>
                  <Link href={href} className="chip">
                    {tg.tag} <span className="text-muted">{tg.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <WhoToFollow people={people} />
    </>
  );
}

/**
 * The Players tab: anyone who plays on start.gg, on Smashy or not. start.gg can't search players
 * by name, so a tag is looked for in two places: Smashy's saved list of players it has seen
 * (searchSavedPlayers) and the sign-up lists of recent tournaments (searchStartggPlayers). A
 * start.gg profile link finds its player exactly.
 * Open to everyone. A visitor who isn't signed in has limits (guestBudget.ts): past them, the
 * search still answers from the saved list, which costs start.gg nothing.
 */
async function StartggPlayers({ q }: { q: string }) {
  const userId = await getUserId();
  const slug = startggProfileSlug(q);
  const tag = cleanPlayerQuery(q);
  const region = await getViewerRegion(userId);
  const t = await getT();
  // Guests: count this search, and only ask start.gg when they're within their limits.
  const gate: GuestLookup = userId || (!slug && !tag) ? "ok" : await guestLookup();
  const signIn = `/signin?next=${encodeURIComponent(`/search?tab=players${q ? `&q=${encodeURIComponent(q)}` : ""}`)}`;
  const how = (
    <p className="text-meta text-muted">{t("people.search.how", { region: regionName(region) })}</p>
  );
  if (!slug && !tag) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <p className="text-sm text-muted">{t("people.search.typeTag")}</p>
        {how}
      </div>
    );
  }

  let hits: PlayerHit[];
  let partial = false;
  let majors = new Map<string, MajorSummary>();
  try {
    if (slug && gate !== "ok") {
      hits = [];
    } else if (slug) {
      const p = await getStartggPlayerBySlug(slug);
      hits = p ? [{ playerId: p.playerId, tag: p.tag, prefix: p.prefix, seenAt: "", count: 1 }] : [];
    } else if (gate !== "ok") {
      hits = mergePlayerHits(tag!, [], await searchSavedPlayers(tag!)); // the saved list only: no start.gg requests
    } else {
      // Both at once. Either can fail by itself (start.gg busy, database slow): the other still answers.
      const [live, saved] = await Promise.allSettled([
        searchStartggPlayers(tag!.toLowerCase(), region), // lower-cased so "MkLeo" and "mkleo" share one saved answer
        searchSavedPlayers(tag!),
      ]);
      if (live.status === "rejected" && saved.status === "rejected") throw live.reason;
      if (saved.status === "rejected") console.error("Saved player search failed", saved.reason);
      hits = mergePlayerHits(tag!, live.status === "fulfilled" ? live.value.hits : [], saved.status === "fulfilled" ? saved.value : []);
      partial = live.status === "rejected" || live.value.partial;
    }
    // Not listed: players who asked not to be, and members who keep their stats to themselves (the default for teens).
    const hidden = await playersHidingStats(hits.map((h) => h.playerId));
    hits = hits.filter((h) => !hidden.has(h.playerId));
    // What Smash history knows of each (round 782): several players share a tag ("Zain" found seven),
    // so each row says how many major top 8s that player has, and the one with the most comes first.
    majors = await getMajorSummaries(hits.map((h) => h.playerId)).catch((e) => {
      console.error("Player search: majors not read", e instanceof Error ? e.message : e);
      return new Map<string, MajorSummary>();
    });
    if (tag) hits = byMajors(tag, hits, majors);
  } catch (e) {
    console.error("Player search failed", e);
    return <p className="p-4 text-muted">{t("people.startggDown")}</p>;
  }

  return (
    <section className="flex flex-col gap-2 p-4" aria-labelledby="startgg-players">
      <h2 id="startgg-players" className="font-bold">{t("people.search.playersOnStartgg")}</h2>
      {hits.length > 0 ? (
        (() => {
          // Rows that say something about the player (major results, or where they last played) come first.
          // Bare rows (common when start.gg is busy and only saved names answer) fold away when there are
          // others, so "Zain" doesn't show as four identical lines (round 872).
          const known = (h: (typeof hits)[number]) => majors.has(h.playerId) || !!h.seenAt;
          const shown = hits.some(known) ? hits.filter(known) : hits;
          const bare = hits.some(known) ? hits.filter((h) => !known(h)) : [];
          const rowFor = (h: (typeof hits)[number]) => (
            <li key={h.playerId}>
              <Link href={`/players/${h.playerId}`} className="flex items-center gap-3 py-2 hover:bg-surface">
                <Avatar name={h.tag} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {h.prefix && <span className="font-normal text-muted">{h.prefix} | </span>}
                    {h.tag}
                  </span>
                  {majors.has(h.playerId) && (
                    <span className="block truncate text-xs font-semibold text-brand">
                      {majors.get(h.playerId)!.games.map((g) => GAMES[g as GameKey]?.short ?? g).join(", ")}
                      {" · "}
                      {/* No counts here (round 900): the player's page also counts results added by hand, so "75+" here beside
                          "80" there read as numbers that don't match. */}
                      {t(majors.get(h.playerId)!.wins > 0 ? "people.search.majorsWins" : "people.search.majors")}
                    </span>
                  )}
                  {h.seenAt && (
                    <span className="block truncate text-xs text-muted">
                      {h.count > 1 ? t("people.search.playedMore", { event: h.seenAt, n: h.count - 1 }) : t("people.search.played", { event: h.seenAt })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
          return (
            <>
              <ul className="divide-y divide-line">{shown.map(rowFor)}</ul>
              {bare.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer list-none text-sm text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                    {t("people.search.moreBare", { n: bare.length })} <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <ul className="mt-1 divide-y divide-line">{bare.map(rowFor)}</ul>
                </details>
              )}
            </>
          );
        })()
      ) : (
        <p className="text-muted">
          {gate !== "ok"
            ? slug
              ? t("people.search.slugGuest")
              : t("people.search.noneKnown", { tag: tag ?? "" })
            : slug
              ? t("people.search.badSlug")
              : t("people.search.noneLooked", { tag: tag ?? "" })}
        </p>
      )}
      {gate !== "ok" && (
        <p className="text-meta text-muted">
          {withNode(t(gate === "busy" ? "people.search.limitBusy" : "people.search.limitMany", { link: "\u0001" }), <Link href={signIn} className="link">{t("people.search.signIn")}</Link>)}
        </p>
      )}
      {partial && <p className="text-meta text-muted">{t("people.search.partial")}</p>}
      {/* The how-it-works note only when nothing was found (round 882): under real results it read like a developer note. */}
      {hits.length === 0 && how}
    </section>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams;
  const [lang, t] = await Promise.all([getLang(), getT()]);
  return <LangProvider lang={lang}><ResultsBody params={params} t={t} /></LangProvider>;
}

async function ResultsBody({ params, t }: { params: Awaited<PageProps<"/search">["searchParams"]>; t: Translate }) {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const tab: Tab = TABS.some((tb) => tb.key === params.tab) ? (params.tab as Tab) : "top";

  // "#SSBU_CLOUD" -> Cloud's page; "#combovideo" -> the tag page.
  if (/^#[A-Za-z][A-Za-z0-9_]{1,40}$/.test(q)) {
    const tag = parseHashtag(q);
    redirect(tag.game && tag.character ? `/games/${tag.game}/${tag.character}` : `/tags/${tag.raw.toLowerCase()}`);
  }

  // Searching inside one character's library (the search box on a character page).
  const scoped = typeof params.in === "string" ? parseScope(params.in) : null;
  if (scoped) {
    const { game, character, name } = scoped;
    const hits = q.length >= 2 ? searchLibrary(q, 40, { game, character }) : [];
    const discord = characterDiscord(game, character);
    const page = `/games/${game}/${character}`;
    return (
      <>
        <SearchBox q={q} scope={{ value: `${game}/${character}`, name }} t={t} />
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-muted">
            {withNode(t("people.search.searchingLibrary", { name: "\u0001" }), <Link href={`${page}#library`} className="font-semibold text-foreground hover:underline">{name} ({GAMES[game].short})</Link>)}{" "}
            {q && <Link href={`/search?q=${encodeURIComponent(q)}`} className="text-brand">{t("people.search.everything")}</Link>}
          </p>
          {hits.length > 0 ? (
            <ul className="divide-y divide-line">
              {hits.map((h) => (
                <li key={h.link.url} className="flex flex-col py-2">
                  <a href={h.link.url} target="_blank" rel="noopener noreferrer" className="link text-sm font-semibold">{h.link.title} ↗︎<NewTab /></a>
                  <span className="text-meta text-muted">{h.section}{h.link.by ? ` · ${h.link.by}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : q.length >= 2 ? (
            // Only point to something that fits: nothing in the library does, so send them to the people who know.
            <div className="card flex flex-col gap-2 p-4">
              <p className="font-semibold">{t("people.search.libNone", { name, q })}</p>
              {discord ? (
                <>
                  <p className="text-sm text-muted">{withNode(t("people.search.askPlayers", { name, discord: "\u0001" }), <b className="text-foreground">{discord.name}</b>)}</p>
                  <a href={discord.invite} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary self-start">{t("people.search.askDiscord", { name })}<NewTab /></a>
                </>
              ) : (
                <Link href={page} className="text-sm text-brand">{t("people.search.browseCharacter", { name })}</Link>
              )}
            </div>
          ) : null}
        </div>
      </>
    );
  }

  const tabs = (
    <TabBar
      label={t("people.search.tabsLabel")}
      active={tab}
      tabs={TABS.map((tb) => ({ key: tb.key, label: t(tb.label), href: `/search?q=${encodeURIComponent(q)}${tb.key === "top" ? "" : `&tab=${tb.key}`}` }))}
    />
  );

  // People filters: "Looking for a doubles partner" and "same crew / college".
  const crew = typeof params.crew === "string" ? params.crew.trim().slice(0, 40) : "";
  if (params.doubles === "1" || crew) {
    const found = await findPeople(crew ? { crew } : { doubles: true });
    return (
      <>
        <SearchBox q={q} t={t} />
        <section className="flex flex-col gap-2 p-4">
          <h2 className="text-lg font-bold">{crew ? crew : t("people.edit.lfg")}</h2>
          {found.length ? <PeopleList people={found} t={t} /> : <p className="text-muted">{crew ? t("people.search.noCrew") : t("people.search.noLfg")}</p>}
        </section>
      </>
    );
  }

  // Players on start.gg: its own tab, because each search asks start.gg (the other tabs don't).
  if (tab === "players") {
    return (
      <>
        <SearchBox q={q} players t={t} />
        <div className="mt-3">{tabs}</div>
        {q.length >= 2 && (
          <Suspense fallback={null}>
            <div className="mt-3"><HistoryNameHits q={q} t={t} /></div>
          </Suspense>
        )}
        <Suspense fallback={<PeopleSkeleton count={4} label={t("people.search.searchingStartgg")} />}>
          <StartggPlayers q={q} />
        </Suspense>
      </>
    );
  }

  if (q.length < 2) {
    return (
      <>
        <SearchBox q={q} t={t} />
        {/* An empty search page (round 842): the examples are buttons to tap, and the other ways in are
            cards, instead of a paragraph and three plain links on an empty page. */}
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-muted">{t("people.search.try")}</p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_EXAMPLES.map((ex) => (
              <Link key={ex} href={`/search?q=${encodeURIComponent(ex)}`} className="chip">{ex}</Link>
            ))}
          </div>
          <ul className="card mt-1 flex flex-col divide-y divide-line overflow-hidden">
            <li><Link href="/search?tab=players" className="flex items-center gap-3 px-4 py-3 font-semibold hover:bg-surface"><Icon name="trophy" className="text-lg text-brand" /> {t("people.search.lookUpAny")}</Link></li>
            <li><Link href="/games" className="flex items-center gap-3 px-4 py-3 font-semibold hover:bg-surface"><Icon name="file" className="text-lg text-brand" /> {t("people.search.browseByCharacter")}</Link></li>
            <li><Link href="/search?doubles=1" className="flex items-center gap-3 px-4 py-3 font-semibold hover:bg-surface"><Icon name="users" className="text-lg text-brand" /> {t("people.search.findPartner")}</Link></li>
          </ul>
        </div>
        <Suspense fallback={null}>
          <SearchDiscovery />
        </Suspense>
      </>
    );
  }

  const userId = await getUserId();
  const want = (t: Tab) => tab === "top" || tab === t;
  const [people, postIds, highlightIds, events, seasons] = await Promise.all([
    want("people") ? searchPeople(q, tab === "top" ? 3 : 20) : Promise.resolve([]),
    want("posts") ? searchPostIds(q, tab === "top" ? 5 : 30) : Promise.resolve([]),
    want("resources") ? searchHighlightIds(q, tab === "top" ? 4 : 20) : Promise.resolve([]),
    tab === "top" ? searchHostedEvents(q, 3, userId).catch(() => []) : tab === "events" ? searchHostedEvents(q, 30, userId, { past: true }).catch(() => []) : Promise.resolve([]),
    want("events") ? searchSeasons(q, tab === "top" ? 3 : 10).catch(() => []) : Promise.resolve([]),
  ]);
  // Majors from Smash history and the majors list, past and upcoming (round 842).
  const majors = want("events") ? await searchMajors(q, tab === "top" ? 3 : 15).catch(() => []) : [];
  const [posts, highlights, winners] = await Promise.all([
    getPostsByIds(postIds, userId),
    getHighlightsByIds(highlightIds, userId),
    getEventWinners(events.filter((e) => e.status === "completed").map((e) => e.id)).catch(() => ({}) as Record<string, string>),
  ]);
  const characters = tab === "top" ? searchCharacters(q) : [];
  const library = want("resources") ? searchLibrary(q, tab === "top" ? 5 : 40) : [];
  // A question about a character that no resource fits: point to the people who'd know (their Discord).
  const askCommunity =
    want("resources") && !library.length && !highlights.length
      ? charactersIn(q)
          .flatMap((c) => {
            const d = characterDiscord(c.game, c.character);
            return d ? [{ ...c, discord: d }] : [];
          })
          .slice(0, 2)
      : [];
  const now = unixNow();
  const nothing = !characters.length && !people.length && !posts.length && !highlights.length && !events.length && !majors.length && !seasons.length && !library.length && !askCommunity.length;

  return (
    <>
      <SearchBox q={q} t={t} />
      <div className="mt-3">{tabs}</div>
      <div className="flex flex-col gap-5 py-4">
        {characters.length > 0 && (
          <section className="flex flex-col gap-2 px-4">
            <h2 className="font-bold">{t("people.stats.characters")}</h2>
            <div className="flex flex-wrap gap-2">
              {characters.map((c) => (
                <Link key={`${c.game}-${c.key}`} href={`/games/${c.game}/${c.key}`} className="btn btn-sm btn-outline">
                  {characterLabel(c)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="flex flex-col gap-1 px-4" aria-labelledby="search-events">
            <h2 id="search-events" className="font-bold">{t("people.search.tab.events")}{tab === "events" && <span className="font-normal text-muted">{t("people.search.hostedOn")}</span>}</h2>
            <ul className="divide-y divide-line">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href={`/host/${e.id}`} className="flex items-center gap-3 py-2 hover:underline">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.name}</span>
                      <span className="block text-meta text-muted">
                        {e.status === "in_progress" ? t("people.search.liveNow") : e.status === "completed" ? <>{t("people.search.results")}{winners[e.id] && <> · <Icon name="trophy" /> {winners[e.id]}</>} · <LocalTime iso={e.startsAt} style="dayDateTime" /></> : <LocalTime iso={e.startsAt} style="dayDateTime" />} · {e.online ? t("event.online") : (e.location ?? t("event.inPerson"))}
                      </span>
                    </span>
                    <GameBadge game={e.game} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {majors.length > 0 && (
          <section className="flex flex-col gap-1 px-4" aria-labelledby="search-majors">
            <h2 id="search-majors" className="font-bold">{t("browse.majors.title")}</h2>
            <ul className="divide-y divide-line">
              {majors.map((m) => (
                <li key={m.slug}>
                  <Link href={majorHref(m.slug)} className="flex items-center gap-3 py-2 hover:underline">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.name}</span>
                      <span className="block truncate text-meta text-muted">
                        {[m.live ? t("people.search.liveNow") : m.startAt.slice(0, 4), m.city, m.entrants ? t("browse.entrants", { n: m.entrants }) : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">{m.games.slice(0, 2).map((g) => <GameBadge key={g} game={g} />)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {seasons.length > 0 && (
          <section className="flex flex-col gap-1 px-4" aria-labelledby="search-seasons">
            <h2 id="search-seasons" className="font-bold">{t("season.title")}</h2>
            <ul className="divide-y divide-line">
              {seasons.map((s) => (
                <li key={s.id}>
                  <Link href={`/seasons/${s.id}`} className="flex items-center gap-3 py-2 hover:underline">
                    <Icon name="trophy" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                    <GameBadge game={s.game} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {people.length > 0 && (
          <section className="flex flex-col gap-1 px-4">
            {tab === "top" && <h2 className="font-bold">{t("people.search.tab.people")}</h2>}
            <PeopleList people={people} t={t} />
            {tab === "top" && <Link href={`/search?q=${encodeURIComponent(q)}&tab=people`} className="text-sm text-brand">{t("people.search.morePeople")}</Link>}
          </section>
        )}

        {tab === "top" && (
          <Suspense fallback={null}>
            <HistoryNameHits q={q} t={t} />
          </Suspense>
        )}

        {(tab === "top" || tab === "people") && cleanPlayerQuery(q) && q.length <= 30 && (
          <p className="px-4 text-sm">
            <Link href={`/search?q=${encodeURIComponent(q)}&tab=players`} className="text-brand">
              {t("people.search.lookUpQ", { q })}
            </Link>
          </p>
        )}

        {highlights.length > 0 && (
          <section className="flex flex-col gap-3 px-4">
            {tab === "top" && <h2 className="font-bold">{t("people.search.tab.resources")}</h2>}
            {highlights.map((h) => <HighlightCard key={h.id} h={h} viewerId={userId} showAuthor />)}
            {tab === "top" && <Link href={`/search?q=${encodeURIComponent(q)}&tab=resources`} className="text-sm text-brand">{t("people.search.moreResources")}</Link>}
          </section>
        )}

        {library.length > 0 && (
          <section className="flex flex-col gap-1 px-4" aria-labelledby="search-library">
            <h2 id="search-library" className="font-bold">{t("people.search.fromLibraries")}</h2>
            <ul className="divide-y divide-line">
              {library.map((h) => (
                <li key={h.link.url} className="flex flex-col py-2">
                  <a href={h.link.url} target="_blank" rel="noopener noreferrer" className="link text-sm font-semibold">{h.link.title} ↗︎<NewTab /></a>
                  <span className="text-meta text-muted">
                    {h.character ? (
                      <Link href={`/games/${h.game}/${h.character}#library`} className="hover:underline">{h.name} ({GAMES[h.game].short})</Link>
                    ) : (
                      <Link href={`/games/${h.game}`} className="hover:underline">{GAMES[h.game].name}</Link>
                    )}
                    {" · "}{h.section}{h.link.by ? ` · ${h.link.by}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {tab === "top" && library.length >= 5 && <Link href={`/search?q=${encodeURIComponent(q)}&tab=resources`} className="text-sm text-brand">{t("people.search.moreLibrary")}</Link>}
          </section>
        )}

        {askCommunity.length > 0 && (
          <section className="mx-4 card flex flex-col gap-2 p-4" aria-labelledby="ask-community">
            <h2 id="ask-community" className="font-bold">{t("people.search.noGuide", { q })}</h2>
            <p className="text-sm text-muted">{t("people.search.askCommunity")}</p>
            <div className="flex flex-wrap gap-2">
              {askCommunity.map((c) => (
                <a key={`${c.game}/${c.character}`} href={c.discord.invite} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                  {t("people.search.askThe", { name: c.name, game: GAMES[c.game].short })}
                <NewTab /></a>
              ))}
            </div>
          </section>
        )}

        {posts.length > 0 && (
          <section className="flex flex-col">
            {tab === "top" && <h2 className="px-4 font-bold">{t("people.search.tab.posts")}</h2>}
            <div className="flex flex-col divide-y divide-line">
              {posts.map((p) => <div key={p.id}><PostCard post={p} now={now} viewerId={userId} /></div>)}
            </div>
            {tab === "top" && <Link href={`/search?q=${encodeURIComponent(q)}&tab=posts`} className="px-4 text-sm text-brand">{t("people.search.morePosts")}</Link>}
          </section>
        )}

        {/* No results isn't a dead end (round 907, checklist.design): the main places under it (the players search link is above). */}
        {nothing && (
          <div className="flex flex-col gap-2 px-4">
            <p className="text-muted">{t("people.search.noResults", { q })}</p>
            <span className="flex flex-wrap gap-2 text-sm">
              <Link href="/games" className="chip">{t("ui.guest.t.characters")}</Link>
              <Link href="/events" className="chip">{t("ui.guest.t.events")}</Link>
              <Link href="/history" className="chip">{t("ui.guest.t.history")}</Link>
            </span>
          </div>
        )}
        {tab === "events" && (
          <p className="px-4 text-sm text-muted">
            {withNode(t("people.search.eventsNote", { link: "\u0001" }), <Link href="/events" className="link">{t("nav.events")}</Link>)}
          </p>
        )}
        {!userId && !nothing && <p className="px-4 text-center text-xs text-muted">{t("people.search.signedInMore")}</p>}
      </div>
    </>
  );
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <section>
      <h1 className="sr-only"><T k="people.search" /></h1>
      <Suspense fallback={<PeopleSkeleton count={5} label="Searching…" />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
