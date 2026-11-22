// One ladder match, shown only to its two players: who you're playing, their netplay code, and the
// buttons to report or confirm the score. Anyone else gets "not found".
import type { Metadata } from "next";
import Link from "next/link";
import OpenSlippi from "@/components/play/OpenSlippi";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CopyButton from "@/components/ui/CopyButton";
import MatchActions from "@/components/ladder/MatchActions";
import Avatar from "@/components/ui/Avatar";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAMES } from "@/lib/games";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { seasonLabel } from "../../seasonLabel";
import { getMatch, type LadderMatch } from "@/lib/ladderData";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { ...pageMeta("Ladder match", "A ranked ladder match on Smashy."), robots: { index: false } };

function Side({ side, label }: { side: LadderMatch["me"]; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <Avatar name={side.person.tag} src={side.person.avatarUrl} size="lg" />
      <span className="max-w-full truncate font-bold">{side.person.tag}</span>
      <span className="text-meta text-muted">{label}</span>
    </div>
  );
}


async function Content({ params }: { params: PageProps<"/ladder/match/[id]">["params"] }) {
  const { id } = await params;
  const match = await getMatch(id, await getUserId());
  if (!match) notFound();
  const { me, opp, status } = match;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const open = status === "playing" || status === "reported" || status === "disputed";
  return (
    <LangProvider lang={lang}>
      <section className="card flex flex-col gap-4 p-4">
        <p className="text-center text-meta text-muted">
          {t("play.match.info", { game: GAMES[match.game].short, season: seasonLabel(match.season, t) })}
        </p>
        <div className="flex items-center gap-3">
          <Side side={me} label={t("play.match.you")} />
          <span className="shrink-0 font-mono text-2xl font-bold tabular-nums">
            {me.score !== null ? `${me.score}–${opp.score}` : t("play.match.vs")}
          </span>
          <Side side={opp} label={opp.person.handle ? t("play.match.opponent") : ""} />
        </div>
        {open && (
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-sm font-semibold">{t("play.match.theirCode")}</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg">{opp.connect}</span>
              <CopyButton text={opp.connect} label={t("common.copy")} />
              {match.game === "melee" && <OpenSlippi code={opp.connect} />}
            </div>
            <p className="text-meta text-muted">
              {t("play.match.yours", { code: me.connect })}{" "}
              {opp.person.handle && (
                <Link href={`/u/${opp.person.handle}`} className="link">{t("play.match.profile", { name: opp.person.tag })}</Link>
              )}
            </p>
          </div>
        )}
        {open ? (
          <MatchActions
            matchId={match.id}
            status={status as "playing" | "reported" | "disputed"}
            reportedByMe={match.reportedByMe}
            oppTag={opp.person.tag}
            myScore={me.score}
            oppScore={opp.score}
          />
        ) : status === "confirmed" ? (
          <p className="text-center">
            {(me.score ?? 0) > (opp.score ?? 0) ? t("play.match.youWon") : t("play.match.theyWon", { name: opp.person.tag })}{" "}
            {me.change !== null ? (
              <b className={me.change >= 0 ? "text-success" : "text-danger"}>
                {t("play.match.rating", { change: `${me.change >= 0 ? "+" : ""}${me.change}` })}
              </b>
            ) : (
              <span className="text-muted">{t("play.match.noChange")}</span>
            )}
          </p>
        ) : (
          <p className="text-center text-muted">{status === "cancelled" ? t("play.match.cancelled") : status === "expired" ? t("play.match.expired") : null}</p>
        )}
      </section>
      <Link href={`/ladder?game=${match.game}`} className="text-sm text-muted hover:text-foreground">{t("play.match.back", { game: GAMES[match.game].short })}</Link>
    </LangProvider>
  );
}

export default function LadderMatchPage(props: PageProps<"/ladder/match/[id]">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h1 className="sr-only"><T k="play.match.title" /></h1>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Content params={props.params} />
      </Suspense>
    </section>
  );
}
