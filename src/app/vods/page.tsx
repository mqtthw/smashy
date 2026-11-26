// The VOD library: every video members have added to a set, newest first, searchable by player and
// tournament, and by game. Each one opens its set's page, where it plays.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import LocalTime from "@/components/ui/LocalTime";
import { GAME_KEYS, GAMES, type GameKey } from "@/lib/games";
import { listVods } from "@/lib/setVods";
import { pageMeta } from "@/lib/siteMeta";
import { vodSetPath } from "@/lib/vods";
import { toEmbed } from "@/lib/embeds";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export const metadata: Metadata = pageMeta("Smash Bros. set VODs", "Videos of Super Smash Bros. sets from locals and majors, added by the community: search by player, tournament or game.");

async function List({ searchParams }: { searchParams: PageProps<"/vods">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const game = typeof sp.game === "string" && (GAME_KEYS as readonly string[]).includes(sp.game) ? (sp.game as GameKey) : null;
  const before = typeof sp.before === "string" && !Number.isNaN(Date.parse(sp.before)) ? sp.before : null;
  const [vods, t, lang] = await Promise.all([listVods({ q, game, before, limit: 30 }).catch(() => []), getT(), getLang()]);
  const link = (o: { game?: GameKey | null; before?: string | null }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const g = o.game === undefined ? game : o.game;
    if (g) p.set("game", g);
    if (o.before) p.set("before", o.before);
    const s = p.toString();
    return s ? `/vods?${s}` : "/vods";
  };
  return (
    <LangProvider lang={lang}>
      <form action="/vods" className="flex gap-2">
        {game && <input type="hidden" name="game" value={game} />}
        <input name="q" defaultValue={q} maxLength={60} placeholder={t("media.vods.placeholder")} aria-label={t("media.vods.searchAria")} className="field min-w-0 flex-1" />
        <button className="btn btn-md btn-primary">{t("media.vods.search")}</button>
      </form>
      <nav aria-label={t("media.vods.games")} className="flex flex-wrap gap-2">
        <Link href={link({ game: null })} aria-current={!game ? "page" : undefined} className="chip">{t("media.vods.allGames")}</Link>
        {GAME_KEYS.map((g) => (
          <Link key={g} href={link({ game: g })} aria-current={game === g ? "page" : undefined} className="chip">{GAMES[g].short}</Link>
        ))}
      </nav>
      {vods.length ? (
        <ul className="card divide-y divide-line">
          {vods.map((v) => (
            <li key={v.id}>
              <Link href={vodSetPath(v.source, v.setId)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
                <span aria-hidden="true" className="text-xl">▶</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {v.p1Tag ?? t("event.tbd")} <span className="font-normal text-muted">vs</span> {v.p2Tag ?? t("event.tbd")}
                  </span>
                  <span className="block truncate text-meta text-muted">
                    {[v.tournament, v.round].filter(Boolean).join(" · ")}
                    {v.playedAt && (
                      <>
                        {" · "}
                        <LocalTime iso={v.playedAt} style="date" />
                      </>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {v.game && v.game in GAMES && <GameBadge game={v.game as GameKey} />}
                  <span className="text-meta text-muted">{toEmbed(v.url)?.provider ?? t("media.vods.video")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-4 text-sm text-muted">
          {t(q || game ? "media.vods.noMatch" : "media.vods.none")} {t("media.vods.howToAdd")}
        </p>
      )}
      {vods.length === 30 && (
        <Link href={link({ before: vods[vods.length - 1].createdAt })} className="btn btn-sm btn-outline self-start">
          {t("media.vods.older")}
        </Link>
      )}
    </LangProvider>
  );
}

export default function VodsPage(props: PageProps<"/vods">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-bold"><T k="media.vods.title" /></h1>
        <p className="text-sm text-muted">
          <T k="media.vods.intro" />
        </p>
      </header>
      <Suspense fallback={<CardListSkeleton count={4} label="Loading videos…" />}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
