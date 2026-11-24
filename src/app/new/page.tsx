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
import { getLang, getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";

/** Puts a link (or other node) where "\u0001" sits in a translated sentence. */
function withNode(text: string, node: React.ReactNode) {
  const [before, after = ""] = text.split("\u0001");
  return <>{before}{node}{after}</>;
}

export const metadata: Metadata = pageMeta("New to Smash? Getting started in competitive Smash Bros.", "New to smash? Ask anything, find people at your level, and get started with the community's own guides and videos.");

const MAIN_GAMES = GAME_KEYS.filter((g) => !GAMES[g].legacy);
const LOBBY_GAMES: readonly GameKey[] = ["melee", "ultimate", "pplus"];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="card flex flex-col gap-3 p-4">
      <h2 id={id} className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

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

async function Corner({ searchParams }: { searchParams: PageProps<"/new">["searchParams"] }) {
  const sp = await searchParams;
  const userId = await getUserId();
  const mine = (await getMyGames(userId)).filter((g): g is GameKey => MAIN_GAMES.includes(g as GameKey));
  const game: GameKey = MAIN_GAMES.includes(sp.game as GameKey) ? (sp.game as GameKey) : (mine[0] ?? "melee");
  const essentials = (GAME_ESSENTIALS[game] ?? []).filter((e) => !e.general);
  const short = GAMES[game].short;
  const [lang, t] = await Promise.all([getLang(), getT()]);

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
      {essentials.length > 0 && (
        <Section id="start" title={t("people.new.start", { game: short })}>
          <p className="text-sm text-muted">{t("people.new.startBody", { game: short })}</p>
          <ul className="flex flex-col gap-3">
            {essentials.map((e) => (
              <li key={e.url} className="flex flex-col gap-1 rounded-xl border border-line p-3">
                <span className="font-semibold">{e.title}</span>
                <span className="text-sm text-muted">{e.why}</span>
                {e.credit && <span className="text-meta text-muted">{e.credit}</span>}
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand">
                  {e.cta} ↗
                <NewTab /></a>
              </li>
            ))}
          </ul>
          <Link href={`/games/${game}`} className="text-sm text-brand">{t("people.new.moreResources", { game: short })}</Link>
        </Section>
      )}

      <Section id="ask" title={t("people.new.ask")}>
        <p className="text-sm text-muted">{t("people.new.askBody")}</p>
        <Link href={`/discuss/new?game=${game}&flair=newplayer`} className="btn btn-md btn-primary self-start">{t("people.new.askButton", { game: short })}</Link>
        <Suspense fallback={<CardListSkeleton count={2} label={t("people.new.loadingQuestions")} />}>
          <Questions game={game} userId={userId} />
        </Suspense>
      </Section>

      <Section id="level" title={t("people.new.level")}>
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

      <Section id="watch" title={t("people.new.watch")}>
        <Suspense fallback={<CardListSkeleton count={2} label={t("people.new.loadingVideos")} />}>
          <Videos game={game} />
        </Suspense>
      </Section>
    </LangProvider>
  );
}

export default function NewPlayersPage(props: PageProps<"/new">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
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
