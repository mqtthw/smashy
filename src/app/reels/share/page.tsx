import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { MAX_CLIPS_PER_DAY, getMySubmissions, type SubmissionStatus } from "@/lib/reelSubmissions";
import { getUserId } from "@/lib/supabase/server";
import { getMyGames } from "@/lib/viewer";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import ShareClipForm from "./form";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.shareClip"), robots: { index: false } };
}

const STATUS: Record<SubmissionStatus, MessageKey> = { pending: "media.share.status.pending", approved: "media.share.status.approved", rejected: "media.share.status.rejected" };

async function Share() {
  const userId = await getUserId();
  if (!userId) redirect(signInPath("/reels/share"));
  const [games, mine, t, lang] = await Promise.all([getMyGames(userId), getMySubmissions(userId), getT(), getLang()]);
  const defaultGame = (games.find((g) => GAME_KEYS.includes(g as GameKey)) as GameKey | undefined) ?? "melee";

  return (
    <LangProvider lang={lang}>
      <ShareClipForm defaultGame={defaultGame} />
      <section aria-labelledby="mine" className="flex flex-col gap-2">
        <h2 id="mine" className="font-bold">{t("media.share.yours")}</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">{t("media.share.nothingYet")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((s) => (
              <li key={s.id} className="card flex items-center gap-3 p-2 text-sm">
                {s.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.thumbnailUrl} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" loading="lazy" />
                )}
                <div className="min-w-0 flex-1">
                  {s.status === "approved" ? (
                    <Link href={`/reels/${encodeURIComponent(s.clipId)}`} className="block truncate font-semibold hover:underline">{s.title || t("media.reels.untitled")}</Link>
                  ) : (
                    <span className="block truncate font-semibold">{s.title || t("media.reels.untitled")}</span>
                  )}
                  <span className="flex items-center gap-1.5 text-meta text-muted">
                    <GameBadge game={s.game} /> {s.channelName} · {t(STATUS[s.status])}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </LangProvider>
  );
}

export default function ShareClipPage() {
  return (
    <section className="flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <Link href="/reels" className="text-meta text-muted hover:text-foreground">← Reels</Link>
        <h1 className="text-2xl font-bold"><T k="media.share.title" /></h1>
        <p className="text-sm text-muted">
          <T k="media.share.intro" values={{ n: MAX_CLIPS_PER_DAY }} />
        </p>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <Share />
      </Suspense>
    </section>
  );
}
