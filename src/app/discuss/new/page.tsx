import type { Metadata } from "next";
import { GAMES } from "@/lib/games";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import ThreadComposer from "@/components/discuss/ThreadComposer";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { CHARACTERS } from "@/lib/characters";
import { FEED_GAMES, type FeedGame } from "@/lib/postConstants";
import { getUserId } from "@/lib/supabase/server";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.newThread"), robots: { index: false } };
}

async function Composer({ searchParams }: { searchParams: PageProps<"/discuss/new">["searchParams"] }) {
  const sp = await searchParams;
  if (!(await getUserId())) redirect(signInPath("/discuss/new"));
  const game = (FEED_GAMES as readonly string[]).includes(String(sp.game)) ? (sp.game as FeedGame) : "general";
  const valid = (c: unknown) => (game !== "general" && CHARACTERS[game].some((x) => x.key === c) ? String(c) : "");
  const character = valid(sp.character);
  const vs = character ? valid(sp.vs) : "";
  const newPlayer = sp.flair === "newplayer";
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <LangProvider lang={lang}>
      <Link href={game === "general" ? "/discuss" : `/discuss?game=${game}`} className="block px-4 pt-4 text-sm text-muted hover:text-foreground">{t("feed.post.backDiscussions")}</Link>
      <h1 className="px-4 pt-2 text-2xl font-bold">{newPlayer ? t("feed.discuss.ask") : t("feed.discuss.start")}</h1>
      {newPlayer && (
        <p className="px-4 pt-1 text-sm text-muted">
          {game === "general" ? t("feed.discuss.newPlayerNote") : t("feed.discuss.newPlayerNoteGame", { game: GAMES[game].short })}
        </p>
      )}
      <ThreadComposer defaultGame={game} defaultCharacter={character} defaultVs={vs && vs !== character ? vs : ""} defaultFlair={newPlayer ? "newplayer" : undefined} />
    </LangProvider>
  );
}

export default function NewThreadPage(props: PageProps<"/discuss/new">) {
  return (
    <section>
      <Suspense fallback={<PageSkeleton />}>
        <Composer searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
