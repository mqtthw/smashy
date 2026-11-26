import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CharacterIcon from "@/components/CharacterIcon";
import PostCard from "@/components/feed/PostCard";
import HighlightCard from "@/components/highlights/HighlightCard";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { characterDiscord } from "@/lib/characterDiscords";
import { characterName } from "@/lib/characters";
import { unixNow } from "@/lib/format";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { getMatchupHighlights } from "@/lib/highlights";
import { getMatchupPosts } from "@/lib/posts";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";

const isGame = (g: string): g is GameKey => GAME_KEYS.includes(g as GameKey);

function resolve(game: string, character: string, opponent: string) {
  if (!isGame(game) || character === opponent) return null;
  const a = characterName(game, character);
  const b = characterName(game, opponent);
  return a && b ? { game, a, b } : null;
}

export async function generateMetadata({ params }: PageProps<"/games/[game]/[character]/vs/[opponent]">): Promise<Metadata> {
  const { game, character, opponent } = await params;
  const m = resolve(game, character, opponent);
  if (!m) return { title: "Not found" };
  return {
    ...pageMeta(`${m.a} vs ${m.b} (${GAMES[m.game].short}): matchup guides and VODs`, `The smash community's best ${m.a} vs ${m.b} guides, set VODs and discussions for ${GAMES[m.game].name}.`),
    alternates: { canonical: `/games/${game}/${character}/vs/${opponent}` },
  };
}

/**
 * One matchup ("Fox vs Marth"): the community's most upvoted guides and set VODs from either side,
 * plus discussions about it. No ratings or verdicts: it collects what players share.
 */
async function Matchup({ params }: Pick<PageProps<"/games/[game]/[character]/vs/[opponent]">, "params">) {
  const { game, character, opponent } = await params;
  const m = resolve(game, character, opponent);
  if (!m) notFound();
  const userId = await getUserId();
  const [resources, posts, t, lang] = await Promise.all([
    getMatchupHighlights(m.game, character, opponent, userId),
    getMatchupPosts(m.game, character, opponent, userId),
    getT(),
    getLang(),
  ]);
  const vods = resources.filter((h) => h.type === "vod");
  const guides = resources.filter((h) => h.type !== "vod");
  const now = unixNow();
  const discords = [character, opponent].flatMap((c) => {
    const d = characterDiscord(m.game, c);
    return d ? [{ who: characterName(m.game, c)!, ...d }] : [];
  });

  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-2 pt-2">
        <Link href={`/games/${game}/${character}`} className="text-sm text-muted hover:text-foreground">← {m.a}</Link>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          <CharacterIcon game={m.game} character={character} size={36} />
          {m.a} <span className="text-muted">{t("media.mu.vs")}</span> {m.b}
          <CharacterIcon game={m.game} character={opponent} size={36} />
        </h1>
        <p className="text-muted">
          {t("media.mu.intro2", { game: GAMES[m.game].short })}{" "}
          <Link href={`/games/${game}/${opponent}/vs/${character}`} className="link">{t("media.mu.otherSide", { name: m.b })}</Link>
        </p>
        {userId && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/highlights/new?game=${game}&character=${character}&vs=${opponent}&type=matchup`} className="btn btn-md btn-primary">{t("media.mu.addGuide")}</Link>
            <Link href={`/highlights/new?game=${game}&character=${character}&vs=${opponent}&type=vod`} className="btn btn-md btn-outline">{t("media.mu.addVod")}</Link>
            <Link href={`/discuss/new?game=${game}&character=${character}&vs=${opponent}`} className="btn btn-md btn-ghost">{t("media.mu.discuss")}</Link>
          </div>
        )}
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="guides">
        <h2 id="guides" className="font-bold">{t("media.mu.guides")}</h2>
        {guides.length === 0 ? (
          <p className="text-sm text-muted">{t("media.mu.noGuides", { a: m.a, b: m.b })}</p>
        ) : (
          guides.map((h) => <HighlightCard key={h.id} h={h} viewerId={userId} showAuthor />)
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="vods">
        <h2 id="vods" className="font-bold">{t("media.mu.vods")}</h2>
        {vods.length === 0 ? (
          <p className="text-sm text-muted">{t("media.mu.noVods")}</p>
        ) : (
          vods.map((h) => <HighlightCard key={h.id} h={h} viewerId={userId} showAuthor />)
        )}
      </section>

      <section className="flex flex-col" aria-labelledby="talk">
        <h2 id="talk" className="mb-2 font-bold">{t("media.mu.discussions")}</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted">{t("media.mu.noDiscussions")}</p>
        ) : (
          <div className="card flex flex-col divide-y divide-line">
            {posts.map((p) => <div key={p.id}><PostCard post={p} now={now} viewerId={userId} /></div>)}
          </div>
        )}
      </section>

      {discords.length > 0 && (
        <section className="card flex flex-col gap-2 p-4" aria-labelledby="discords">
          <h2 id="discords" className="font-bold">{t("media.mu.askCommunities")}</h2>
          <p className="text-sm text-muted">{t("media.mu.askBody")}</p>
          <div className="flex flex-wrap gap-2">
            {discords.map((d) => (
              <a key={d.invite} href={d.invite} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                {t("media.mu.discordLink", { name: d.who })}
              <NewTab /></a>
            ))}
          </div>
        </section>
      )}
      {!userId && <p className="text-center text-xs text-muted">{t("media.signedInMore")}</p>}
    </LangProvider>
  );
}

export default function MatchupPage(props: PageProps<"/games/[game]/[character]/vs/[opponent]">) {
  return (
    <section className="flex flex-col gap-5 p-4">
      <Suspense fallback={<CardListSkeleton />}>
        <Matchup params={props.params} />
      </Suspense>
    </section>
  );
}
