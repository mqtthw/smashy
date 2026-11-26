// Smash terms & tech (round 914): the words a newcomer hears, each with a plain one-line meaning and,
// where the community has posted one, a short looping clip of it from a real game. The list is
// src/lib/glossary.ts; the clips are ordinary Smashy posts (src/lib/clipCards.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ClipCard from "@/components/ClipCard";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { clipCaption } from "@/lib/clipCards";
import { GLOSSARY, TERM_IDS } from "@/lib/glossary";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { getClipCards, type Post } from "@/lib/posts";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = pageMeta(
  "Smash terms and tech: a glossary for new players",
  "What Smash players mean by wavedash, L-cancel, DI, edgeguard, neutral, bracket, friendlies and more: plain one-line meanings, with short clips from real games.",
);

async function Terms() {
  const [t, userId] = await Promise.all([getT(), getUserId()]);
  // A slow or failing lookup only leaves the clips out; the words are the page.
  const clips = await getClipCards(TERM_IDS, userId).catch(() => new Map<string, Post>());
  return (
    <>
      <nav aria-label={t("people.gl.title")} className="flex flex-wrap gap-2">
        {GLOSSARY.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="chip">{t(g.title)}</a>
        ))}
      </nav>
      {GLOSSARY.map((g) => (
        <section key={g.id} aria-labelledby={g.id} className="card flex flex-col gap-1 p-4">
          <h2 id={g.id} className="scroll-mt-16 font-bold">{t(g.title)}</h2>
          <dl className="flex flex-col divide-y divide-line">
            {g.terms.map((term) => {
              const clip = clips.get(term.id);
              return (
                <div key={term.id} id={term.id} className={`scroll-mt-16 py-3 last:pb-0 ${clip?.video ? "grid items-start gap-3 sm:grid-cols-[1fr_18rem]" : ""}`}>
                  <div>
                    <dt className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-lg font-bold text-brand">{term.term}</span>
                      {/* The term's hashtag: how a clip gets attached to it. */}
                      <span className="text-meta text-muted">#{term.id}</span>
                    </dt>
                    <dd className="text-sm">{t(term.key)}</dd>
                  </div>
                  {clip?.video && (
                    <ClipCard
                      src={clip.video.url}
                      poster={clip.video.posterUrl}
                      width={clip.video.width}
                      height={clip.video.height}
                      caption={clipCaption(clip.body)}
                      by={t("people.new.videos.by", { name: clip.author.tag })}
                      href={`/post/${clip.id}`}
                      label={term.term}
                    />
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      ))}
      <p className="text-sm text-muted">{t("people.gl.add")}</p>
    </>
  );
}

export default function GlossaryPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header>
        <Link href="/new" className="text-sm text-muted hover:text-foreground"><T k="people.gl.back" /></Link>
        <h1 className="text-2xl font-bold"><T k="people.gl.title" /></h1>
        <p className="text-sm text-muted"><T k="people.gl.intro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={4} label="Loading…" />}>
        <Terms />
      </Suspense>
    </section>
  );
}
