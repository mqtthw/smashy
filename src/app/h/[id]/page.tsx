import LocalTime from "@/components/ui/LocalTime";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LinkifiedText from "@/components/feed/LinkifiedText";
import EmbedPlayer from "@/components/highlights/EmbedPlayer";
import { HighlightTags } from "@/components/highlights/HighlightCard";
import VoteButton from "@/components/highlights/VoteButton";
import LiveReportButton from "@/components/play/LiveReportButton";
import ConfirmSubmit from "@/components/ui/ConfirmSubmit";
import { deleteHighlight } from "@/app/highlights/actions";
import { toEmbed } from "@/lib/embeds";
import { getHighlight } from "@/lib/highlights";
import { getUserId } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/h/[id]">): Promise<Metadata> {
  const { id } = await params;
  const h = await getHighlight(id, null).catch(() => null);
  if (!h) return { title: "Highlight not found", robots: { index: false } };
  return { title: h.title, description: h.description ?? `A highlight by ${h.author.tag} on Smashy` };
}

async function HighlightView({ params }: Pick<PageProps<"/h/[id]">, "params">) {
  const { id } = await params;
  const userId = await getUserId();
  const [h, t, lang] = await Promise.all([getHighlight(id, userId), getT(), getLang()]);
  if (!h) notFound();
  const embed = h.url ? toEmbed(h.url) : null;
  const mine = h.author.id === userId;

  return (
    <LangProvider lang={lang}>
    <article className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <HighlightTags h={h} />
        <VoteButton highlightId={h.id} voted={h.votedByMe} count={h.voteCount} signedIn={!!userId} isMine={mine} />
      </div>
      <h1 className="text-2xl font-bold">{h.title}</h1>
      <p className="-mt-2 text-sm text-muted">
        {t("feed.h.by")} <Link href={`/u/${h.author.handle}`} className="font-semibold text-foreground hover:underline">{h.author.tag}</Link> · <LocalTime iso={h.createdAt} style="date" />
      </p>
      {h.removed && <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">{t("feed.h.removed")}</p>}
      {embed && <EmbedPlayer embed={embed} />}
      {h.description && <p>{h.description}</p>}
      {h.guideBody && (
        <section className="card p-4">
          <LinkifiedText text={h.guideBody} />
        </section>
      )}
      <div className="flex items-center gap-4 text-sm">
        {mine ? (
          <form action={deleteHighlight.bind(null, h.id)}>
            <ConfirmSubmit message={t("feed.h.deleteConfirm")} className="text-muted underline">{t("feed.h.delete")}</ConfirmSubmit>
          </form>
        ) : (
          userId && <LiveReportButton kind="highlight" targetId={h.id} />
        )}
      </div>
    </article>
    </LangProvider>
  );
}

export default function HighlightPage(props: PageProps<"/h/[id]">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Suspense fallback={<PageSkeleton />}>
        <HighlightView params={props.params} />
      </Suspense>
    </section>
  );
}
