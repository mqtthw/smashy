// New players corner: one place per game for people starting out. Ask anything (threads tagged
// "New player", unanswered ones first so experienced players can help), find people at your level
// (beginner-friendly lobbies and the ladder, which pairs close ratings first), find a local, and the
// community's own guides and videos. Smashy links to what the community made; it doesn't give advice.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ThreadRow from "@/components/discuss/ThreadRow";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAME_ESSENTIALS } from "@/lib/essentials";
import { unixNow } from "@/lib/format";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { getOpenLobbies } from "@/lib/play";
import { getThreads, type Post } from "@/lib/posts";
import { listVods } from "@/lib/setVods";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { getMyGames } from "@/lib/viewer";
import { vodSetPath } from "@/lib/vods";
import { LangProvider, T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";
import EmbedPlayer from "@/components/highlights/EmbedPlayer";
import { toEmbed } from "@/lib/embeds";
import CharacterIcon from "@/components/CharacterIcon";
import { CHARACTERS } from "@/lib/characters";
import { stockIconUrl } from "@/lib/mainBadge";
import { starterVideos, type StarterVideo } from "@/lib/starterVideos";

/** Puts a link (or other node) where "\u0001" sits in a translated sentence. */
function withNode(text: string, node: React.ReactNode) {
  const [before, after = ""] = text.split("\u0001");
  return <>{before}{node}{after}</>;
}

export const metadata: Metadata = pageMeta("New to Smash? Getting started in competitive Smash Bros.", "New to smash? Ask anything, find people at your level, and get started with the community's own guides and videos.");

const MAIN_GAMES = GAME_KEYS.filter((g) => !GAMES[g].legacy);
const LOBBY_GAMES: readonly GameKey[] = ["melee", "ultimate", "pplus"];

// The menu skin (round 910) numbers the sections like a path to follow, and adds two of its own: what a
// first local is like, and the words a newcomer will hear. `skinOnly` sections show only under the skin.
function Section({ id, title, num, skinOnly, children }: { id: string; title: string; num?: number; skinOnly?: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={`card flex scroll-mt-16 flex-col gap-3 p-4 ${skinOnly ? "skin-new" : ""}`}>
      <h2 id={id} className="flex items-center gap-3 font-bold">
        {num !== undefined && <span aria-hidden="true" className="skin-new menu-bar-num">{num}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

// Words a newcomer hears at a tournament. The words themselves stay as players say them; only the
// meanings are translated (people.new.w.*). Plain facts about how tournaments work, not advice.
const WORDS: { term: string; key: string }[] = [
  { term: "Local", key: "local" },
  { term: "Major", key: "major" },
  { term: "Bracket", key: "bracket" },
  { term: "Double elimination", key: "double" },
  { term: "Set", key: "set" },
  { term: "Stock", key: "stock" },
  { term: "Seed", key: "seed" },
  { term: "Pools", key: "pools" },
  { term: "Friendlies", key: "friendlies" },
  { term: "Main", key: "main" },
  { term: "TO", key: "to" },
  { term: "DQ", key: "dq" },
  { term: "Netplay", key: "netplay" },
];
const LOCAL_STEPS = ["people.new.local.s1", "people.new.local.s2", "people.new.local.s3", "people.new.local.s4", "people.new.local.s5"] as const;

/** Beginners' questions: unanswered first (so helpers see them), then the newest answered ones. */
async function Questions({ game, userId }: { game: GameKey; userId: string | null }) {
  const [open, recent, t] = await Promise.all([
    getThreads({ game, flair: "newplayer", noReplies: true, sort: "new", userId }).catch(() => ({ posts: [] as Post[], hasMore: false })),
    getThreads({ game, flair: "newplayer", sort: "new", userId }).catch(() => ({ posts: [] as Post[], hasMore: false })),
    getT(),
  ]);
  const unanswered = open.posts.slice(0, 5);
  const seen = new Set(unanswered.map((p) => p.id));
  const answered = recent.posts.filter((p) => !seen.has(p.id)).slice(0, 5);
  const now = unixNow();
  if (!unanswered.length && !answered.length) {
    return <p className="text-sm text-muted">{t("people.new.noQuestions")}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {unanswered.length > 0 && (
        <div>
          <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.new.waiting")}</h3>
          <ul className="mt-2 flex flex-col gap-3">{unanswered.map((p) => <ThreadRow key={p.id} post={p} now={now} />)}</ul>
        </div>
      )}
      {answered.length > 0 && (
        <div>
          <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.new.answered")}</h3>
          <ul className="mt-2 flex flex-col gap-3">{answered.map((p) => <ThreadRow key={p.id} post={p} now={now} />)}</ul>
        </div>
      )}
      <Link href={`/discuss?game=${game}&flair=newplayer`} className="text-sm text-brand">{t("people.new.allQuestions", { game: GAMES[game].short })}</Link>
    </div>
  );
}

/** Open lobbies that welcome new players (beginner-friendly first, then "all skill levels"). Members only, like the Play page. */
async function Lobbies({ game, userId }: { game: GameKey; userId: string | null }) {
  if (!LOBBY_GAMES.includes(game)) return null;
  const t = await getT();
  if (!userId) {
    return (
      <p className="text-sm text-muted">
        {withNode(t("people.new.joinLobbies", { link: "\u0001" }), <Link href="/signin?next=/new" className="link">{t("people.new.join")}</Link>)}
      </p>
    );
  }
  const lobbies = (await getOpenLobbies(game).catch(() => []))
    .filter((l) => l.skill === "beginner" || l.skill === "any")
    .sort((a, b) => Number(b.skill === "beginner") - Number(a.skill === "beginner"))
    .slice(0, 5);
  if (!lobbies.length) {
    return (
      <p className="text-sm text-muted">
        {withNode(t("people.new.noLobbies", { link: "\u0001" }), <Link href={`/play?room=${game}`} className="link">{t("people.new.hostOne")}</Link>)}
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-line">
      {lobbies.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{l.title}</span>
            <span className="block truncate text-meta text-muted">
              {l.hostTag} · {l.region} · {l.skill === "beginner" ? t("people.new.beginner") : t("people.new.allLevels")}
            </span>
          </span>
          <Link href={`/play?room=${game}`} className="btn btn-sm btn-outline shrink-0">{t("people.new.open")}</Link>
        </li>
      ))}
    </ul>
  );
}

async function Videos({ game }: { game: GameKey }) {
  const [vods, t] = await Promise.all([listVods({ game, limit: 4 }).catch(() => []), getT()]);
  return (
    <div className="flex flex-col gap-2">
      {vods.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {vods.map((v) => (
            <li key={v.id}>
              <Link href={vodSetPath(v.source, v.setId)} className="flex items-center gap-2 py-2 text-sm hover:underline">
                <span aria-hidden="true">▶</span>
                <span className="min-w-0 truncate">
                  {v.p1Tag ?? t("event.tbd")} <span className="text-muted">vs</span> {v.p2Tag ?? t("event.tbd")}
                  {v.tournament && <span className="text-muted"> · {v.tournament}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">
        {t("people.new.watchBody")}{" "}
        <Link href={`/vods?game=${game}`} className="link">{t("people.new.allVideos", { game: GAMES[game].short })}</Link>
        {" · "}
        <Link href={`/games/${game}`} className="link">{t("people.new.clips")}</Link>
      </p>
    </div>
  );
}

/** One beginner video: it plays in place when pressed; under it, its title and who made it. */
function VideoTile({ v, by }: { v: StarterVideo; by: (name: string) => string }) {
  const embed = toEmbed(v.url);
  if (!embed) return null;
  return (
    <li className="flex min-w-0 flex-col gap-1">
      <EmbedPlayer embed={embed} />
      <span className="text-sm leading-snug font-semibold">{v.title}</span>
      {v.by && <span className="text-meta text-muted">{by(v.by)}</span>}
    </li>
  );
}

async function Corner({ searchParams }: { searchParams: PageProps<"/new">["searchParams"] }) {
  const sp = await searchParams;
  const userId = await getUserId();
  const mine = (await getMyGames(userId)).filter((g): g is GameKey => MAIN_GAMES.includes(g as GameKey));
  const game: GameKey = MAIN_GAMES.includes(sp.game as GameKey) ? (sp.game as GameKey) : (mine[0] ?? "melee");
  const essentials = (GAME_ESSENTIALS[game] ?? []).filter((e) => !e.general);
  const short = GAMES[game].short;
  const [lang, t] = await Promise.all([getLang(), getT()]);
  // Beginner videos from the community (round 911), in "Watch and learn" since round 914.
  const videos = starterVideos(game);
  // Every game's fighters that have an icon (round 934, Matthew: "I'd like to see the icons for p+ as well").
  // stockIconUrl knows which picture each game uses: P+ has none of its own and borrows Melee's and Brawl's.
  const fighters = CHARACTERS[game].filter((c) => stockIconUrl({ game, character: c.key })).slice(0, 30);
  // The skin numbers the sections in the order they come, whichever of them this game has.
  let step = 0;

  return (
    <LangProvider lang={lang}>
      <nav aria-label={t("people.games")} className="flex flex-wrap gap-2">
        {MAIN_GAMES.map((g) => (
          <Link key={g} href={`/new?game=${g}`} aria-current={g === game ? "page" : undefined} className="chip">
            {GAMES[g].short}
          </Link>
        ))}
      </nav>

      {/* The starter guides come first (round 793): they're what a newcomer can use straight away, and the
          questions box under them says "No questions yet" until people start asking. */}
      {/* Step 1 is playing (round 914, Matthew: "players should play first and find a character that
          interests them"); the beginner videos moved down to "Watch and learn". */}
      <Section id="play-first" num={++step} title={t("people.new.play.title")}>
        <p className="text-sm text-muted">{t("people.new.play.body")}</p>
        {fighters.length > 0 && (
          <Link href={`/games/${game}`} aria-hidden="true" tabIndex={-1} className="flex flex-wrap gap-1.5">
            {fighters.map((c) => <CharacterIcon key={c.key} game={game} character={c.key} size={28} />)}
          </Link>
        )}
        <Link href={`/games/${game}`} className="btn btn-md btn-primary self-start">{t("people.new.play.button", { game: short })}</Link>
      </Section>

      {essentials.length > 0 && (
        <Section id="start" num={++step} title={t("people.new.start", { game: short })}>
          <p className="text-sm text-muted">{t("people.new.startBody", { game: short })}</p>
          {/* Rows between thin lines, the name as the link (round 891): a box per tool inside the section's box
              read as boxes inside boxes. */}
          <ul className="flex flex-col divide-y divide-line">
            {essentials.map((e) => (
              <li key={e.url} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="self-start font-semibold text-brand hover:underline" title={e.cta}>
                  {e.title} ↗︎
                <NewTab /></a>
                <span className="text-sm text-muted">{e.why}</span>
                {e.credit && <span className="text-meta text-muted">{e.credit}</span>}
              </li>
            ))}
          </ul>
          <Link href={`/games/${game}`} className="text-sm text-brand">{t("people.new.moreResources", { game: short })}</Link>
        </Section>
      )}

      <Section id="first-local" num={++step} skinOnly title={t("people.new.local.title")}>
        <p className="text-sm text-muted">{t("people.new.local.body")}</p>
        <ol className="flex flex-col gap-2 text-sm">
          {LOCAL_STEPS.map((k, i) => (
            <li key={k} className="flex gap-3">
              <span aria-hidden="true" className="w-4 shrink-0 text-right font-black text-brand italic">{i + 1}</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ol>
        <Link href="/events" className="btn btn-md btn-primary self-start">{t("people.new.local.find")}</Link>
      </Section>

      <Section id="words" num={++step} skinOnly title={t("people.new.w.title")}>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {WORDS.map((w) => (
            <div key={w.key}>
              <dt className="font-bold text-brand">{w.term}</dt>
              <dd className="text-muted">{t(`people.new.w.${w.key}` as MessageKey)}</dd>
            </div>
          ))}
        </dl>
        <Link href="/glossary" className="text-sm font-semibold text-brand">{t("people.gl.all")}</Link>
      </Section>

      <Section id="ask" num={++step} title={t("people.new.ask")}>
        <p className="text-sm text-muted">{t("people.new.askBody")}</p>
        <Link href={`/discuss/new?game=${game}&flair=newplayer`} className="btn btn-md btn-primary self-start">{t("people.new.askButton", { game: short })}</Link>
        <Suspense fallback={<CardListSkeleton count={2} label={t("people.new.loadingQuestions")} />}>
          <Questions game={game} userId={userId} />
        </Suspense>
      </Section>

      <Section id="level" num={++step} title={t("people.new.level")}>
        <Suspense fallback={<CardListSkeleton count={2} label={t("people.new.loadingLobbies")} />}>
          <Lobbies game={game} userId={userId} />
        </Suspense>
        {LOBBY_GAMES.includes(game) && (
          <p className="text-sm text-muted">
            {withNode(t("people.new.ladder", { link: "\u0001" }), <Link href={`/ladder?game=${game}`} className="link">{t("people.new.ladderLink")}</Link>)}
            {game === "melee" && (
              <>
                {" "}
                {withNode(t("people.new.slippi", { link: "\u0001" }), <Link href="/replays" className="link">{t("people.new.slippiLink")}</Link>)}
              </>
            )}
          </p>
        )}
        <p className="text-sm text-muted">
          {withNode(t("people.new.inPerson", { link: "\u0001" }), <Link href="/events" className="link">{t("people.new.findLocal")}</Link>)}
        </p>
      </Section>

      <Section id="watch" num={++step} title={t("people.new.watch")}>
        {videos.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {videos.map((v) => <VideoTile key={v.url} v={v} by={(name) => t("people.new.videos.by", { name })} />)}
          </ul>
        )}
        <Suspense fallback={<CardListSkeleton count={2} label={t("people.new.loadingVideos")} />}>
          <Videos game={game} />
        </Suspense>
      </Section>
    </LangProvider>
  );
}

export default function NewPlayersPage(props: PageProps<"/new">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-bold"><T k="people.new.title" /></h1>
        <p className="text-sm text-muted">
          <T k="people.new.intro" />
        </p>
      </header>
      <Suspense fallback={<CardListSkeleton count={4} label="Loading…" />}>
        <Corner searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
