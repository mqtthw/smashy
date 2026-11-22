// Seasons: scenes' own rankings on Smashy (each run by its admins), plus the viewer's own.
import { SeasonRanks } from "@/components/seasons/SeasonParts";
import { memberKey, startggKey } from "@/lib/seasonsMath";
import { getLinkedPlayer } from "@/lib/playerStats";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAMES, isGameKey, MAIN_GAME_KEYS } from "@/lib/games";
import { getLang, getT } from "@/lib/i18n/server";
import { regionName } from "@/lib/regions";
import { listSeasons, type SeasonListItem } from "@/lib/seasons";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { T } from "@/lib/i18n/client";
import { dayRange } from "./parts";

export const metadata: Metadata = pageMeta("Seasons", "Scene rankings on Smashy: each scene's TOs pick the events and the points, and Smashy keeps the standings.");

async function SeasonList({ searchParams }: { searchParams: PageProps<"/seasons">["searchParams"] }) {
  const sp = await searchParams;
  const game = isGameKey(sp.game) ? sp.game : null;
  const [userId, t, lang] = await Promise.all([getUserId(), getT(), getLang()]);
  const { mine, all } = await listSeasons({ game, userId });
  // Your own keys (Smashy account, and your start.gg player if you linked it), for "Where you're ranked".
  const linked = userId ? await getLinkedPlayer(userId).catch(() => null) : null;
  const myKeys = userId ? [memberKey(userId), ...(linked ? [startggKey(linked.playerId)] : [])] : [];
  const card = (s: SeasonListItem) => (
    <li key={s.id}>
      <Link href={`/seasons/${s.id}`} className="card flex flex-col gap-1 p-4 hover:bg-surface">
        <span className="flex items-center gap-2">
          <GameBadge game={s.game} />
          <span className="min-w-0 truncate font-bold">{s.name}</span>
        </span>
        <span className="text-meta text-muted">
          {dayRange(s.startsOn, s.endsOn, lang)}
          {s.region ? ` · ${regionName(s.region)}` : ""}
          {" · "}
          {t("season.list.events", { n: s.events })}
        </span>
        {s.owner && <span className="text-meta text-muted">{t("season.runBy", { names: `@${s.owner.handle}` })}</span>}
      </Link>
    </li>
  );
  return (
    <>
      {sp.msg === "deleted" && <p className="rounded-lg bg-surface p-3 text-sm">{t("season.msg.deleted")}</p>}
      {mine.length > 0 && (
        <section aria-labelledby="my-seasons" className="flex flex-col gap-2">
          <h2 id="my-seasons" className="font-bold">{t("season.list.mine")}</h2>
          <ul className="flex flex-col gap-2">{mine.map(card)}</ul>
        </section>
      )}
      {myKeys.length > 0 && (
        <Suspense fallback={null}>
          <section aria-labelledby="my-ranks" className="flex flex-col gap-1">
            <h2 id="my-ranks" className="font-bold">{t("season.list.ranked")}</h2>
            <SeasonRanks keys={myKeys} viewerId={userId} empty={t("season.list.rankedNone")} />
          </section>
        </Suspense>
      )}
      <nav aria-label={t("season.list.filter")} className="flex flex-wrap gap-2">
        <Link href="/seasons" aria-current={!game ? "page" : undefined} className="chip py-1">{t("season.list.allGames")}</Link>
        {MAIN_GAME_KEYS.map((g) => (
          <Link key={g} href={`/seasons?game=${g}`} aria-current={game === g ? "page" : undefined} className="chip py-1">{GAMES[g].short}</Link>
        ))}
      </nav>
      {all.length ? <ul className="flex flex-col gap-2">{all.map(card)}</ul> : <p className="card p-4 text-sm text-muted">{t("season.list.none")}</p>}
    </>
  );
}

export default function SeasonsPage(props: PageProps<"/seasons">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="season.title" /></h1>
        <p className="text-sm text-muted"><T k="season.intro" /></p>
        <Link href="/seasons/new" className="btn btn-md btn-primary self-start"><T k="season.start" /></Link>
      </header>
      <Suspense fallback={<CardListSkeleton count={3} />}>
        <SeasonList searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
