// Two start.gg players side by side: their sets against each other (from both their histories),
// their records and characters, and the opponents they've both played. Open to guests, with the
// same limits as looking up one player (each player counts as one lookup).
import { localeFor } from "@/lib/i18n/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { scoreLine } from "@/lib/brackets/score";
import { guestLookup } from "@/lib/guestLookup";
import { combinedHeadToHead, sharedOpponents } from "@/lib/playerCompare";
import MajorHeadToHead from "@/components/history/MajorHeadToHead";
import { searchSavedPlayers } from "@/lib/playerIndex";
import { computeStats, getVisibleRecentSets, playerOnSmashy, type PlayerStats } from "@/lib/playerStats";
import { getStartggPlayer, type StartggPlayer } from "@/lib/startggPlayers";
import { getUserId } from "@/lib/supabase/server";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { Lang, MessageKey, Values } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.comparePlayers"), robots: { index: false } };
}

type Translate = (key: MessageKey, values?: Values) => string;

const ID = /^\d{1,12}$/;
const pct = (w: number, l: number) => (w + l ? Math.round((w / (w + l)) * 100) : 0);
const when = (unix: number | null, lang: Lang) =>
  unix ? new Intl.DateTimeFormat(localeFor(lang), { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(unix * 1000)) : "";

/** Puts a link (or other node) where "\u0001" sits in a translated sentence. */
function withNode(text: string, node: React.ReactNode) {
  const [before, after = ""] = text.split("\u0001");
  return <>{before}{node}{after}</>;
}

function Limit({ busy, next, t }: { busy: boolean; next: string; t: Translate }) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <h1 className="font-bold">{busy ? t("people.player.busyTitle") : t("people.player.manyTitle")}</h1>
      <p className="text-sm text-muted">{busy ? t("people.player.busy") : t("people.player.many")}</p>
      <Link href={`/signin?next=${encodeURIComponent(next)}`} className="btn btn-md btn-primary self-start">{t("people.player.signInOrJoin")}</Link>
    </div>
  );
}

/** The second player isn't picked yet: search the players Smashy has seen. */
async function PickSecond({ a, q, t }: { a: string; q: string; t: Translate }) {
  const first = await getStartggPlayer(a).catch(() => undefined);
  if (first === null) notFound();
  const found = q.trim().length >= 2 ? (await searchSavedPlayers(q).catch(() => [])).filter((p) => p.playerId !== a).slice(0, 20) : [];
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-title font-bold">{t("people.compare.title", { tag: first?.tag ?? t("people.compare.thisPlayer") })}</h1>
      <form action="/players/compare" className="flex gap-2">
        <input type="hidden" name="a" value={a} />
        <input name="q" defaultValue={q} minLength={2} maxLength={40} required placeholder={t("people.compare.placeholder")} aria-label={t("people.compare.placeholder")} className="field min-w-0 flex-1" />
        <button className="btn btn-md btn-primary">{t("people.search")}</button>
      </form>
      {q.trim().length >= 2 &&
        (found.length ? (
          <ul className="card divide-y divide-line">
            {found.map((p) => (
              <li key={p.playerId}>
                <Link href={`/players/compare?a=${a}&b=${p.playerId}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface">
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {p.prefix && <span className="font-normal text-muted">{p.prefix} | </span>}
                    {p.tag}
                  </span>
                  <span className="shrink-0 text-meta text-brand">{t("people.compare.go")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            {withNode(t("people.compare.none", { q, link: "\u0001" }), <Link href={`/search?tab=players&q=${encodeURIComponent(q)}`} className="link">{t("people.compare.fullSearch")}</Link>)}
          </p>
        ))}
    </section>
  );
}

function Side({ p, stats, align, t }: { p: StartggPlayer; stats: PlayerStats; align: "left" | "right"; t: Translate }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1 ${align === "right" ? "items-end text-right" : ""}`}>
      <Link href={`/players/${p.playerId}`} className="max-w-full truncate text-lg font-bold hover:underline">
        {p.tag}
      </Link>
      {stats.sets > 0 ? (
        <>
          <p className="font-mono text-xl font-bold tabular-nums">
            {stats.wins}–{stats.losses}
          </p>
          <p className="text-meta text-muted">
            {t("people.compare.pct", { pct: pct(stats.wins, stats.losses), n: stats.sets })}
          </p>
          {stats.characters.length > 0 && <p className="text-meta">{stats.characters.slice(0, 3).map((c) => c.name).join(", ")}</p>}
        </>
      ) : (
        <p className="text-meta text-muted">{t("people.noSets")}</p>
      )}
    </div>
  );
}

async function Comparison({ a, b, t, lang }: { a: string; b: string; t: Translate; lang: Lang }) {
  const userId = await getUserId();
  if (!userId) {
    // Two players: two lookups against the visitor's allowance.
    for (let i = 0; i < 2; i++) {
      const gate = await guestLookup();
      if (gate !== "ok") return <Limit busy={gate === "busy"} next={`/players/compare?a=${a}&b=${b}`} t={t} />;
    }
  }
  const [pa, pb, okA, okB] = await Promise.all([getStartggPlayer(a).catch(() => undefined), getStartggPlayer(b).catch(() => undefined), playerOnSmashy(a), playerOnSmashy(b)]);
  if (!okA.allowed || !okB.allowed) return <p className="card p-4 text-sm text-muted">{t("people.compare.oneHidden")}</p>;
  if (pa === null || pb === null) notFound();
  if (!pa || !pb) return <p className="card p-4 text-sm text-muted">{t("people.startggDown")}</p>;
  const [sa, sb] = await Promise.all([getVisibleRecentSets(a).catch(() => null), getVisibleRecentSets(b).catch(() => null)]);
  if (!sa || !sb) return <p className="card p-4 text-sm text-muted">{t("people.startggDown")}</p>;
  const h2h = combinedHeadToHead(sa, sb, a, b);
  const shared = sharedOpponents(sa, sb, a, b);

  return (
    <>
      <h1 className="sr-only">
        {pa.tag} vs {pb.tag}
      </h1>
      <section className="card flex items-start gap-3 p-4" aria-label={t("people.compare.records")}>
        <Side p={pa} stats={computeStats(sa)} align="left" t={t} />
        <span className="pt-1 text-sm text-muted">vs</span>
        <Side p={pb} stats={computeStats(sb)} align="right" t={t} />
      </section>

      <section className="card flex flex-col gap-2 p-4" aria-labelledby="h2h">
        <h2 id="h2h" className="font-bold">{t("people.h2h.title")}</h2>
        {h2h.meetings.length ? (
          <>
            <p className="flex items-center justify-center gap-4 text-center">
              <span className="min-w-0 flex-1 truncate text-right font-semibold">{pa.tag}</span>
              <span className="font-mono text-display font-bold tabular-nums">
                {h2h.aWins}–{h2h.bWins}
              </span>
              <span className="min-w-0 flex-1 truncate text-left font-semibold">{pb.tag}</span>
            </p>
            <ul className="divide-y divide-line">
              {h2h.meetings.slice(0, 12).map((m) => (
                <li key={m.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className={`w-16 shrink-0 truncate font-semibold ${m.dq ? "text-muted" : m.aWon ? "" : "text-muted"}`}>{m.dq ? "DQ" : m.aWon ? pa.tag : pb.tag}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {m.tournamentName} · {m.round}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">{scoreLine(m.aScore, m.bScore)}</span>
                  <span className="w-16 shrink-0 text-right text-meta text-muted">{when(m.completedAt, lang)}</span>
                </li>
              ))}
            </ul>
            <p className="text-meta text-muted">{t("people.compare.h2hNote")}</p>
          </>
        ) : (
          <p className="text-sm text-muted">{t("people.compare.never")}</p>
        )}
      </section>

      <Suspense fallback={null}>
        <MajorHeadToHead a={a} b={b} aTag={pa.tag} bTag={pb.tag} t={t} />
      </Suspense>

      {shared.length > 0 && (
        <section className="card flex flex-col gap-1 p-4" aria-labelledby="shared">
          <h2 id="shared" className="font-bold">{t("people.compare.shared")}</h2>
          <ul className="divide-y divide-line">
            {shared.map((s) => (
              <li key={s.playerId} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-14 shrink-0 font-mono tabular-nums">
                  {s.a.wins}–{s.a.losses}
                </span>
                <Link href={`/players/${s.playerId}`} className="min-w-0 flex-1 truncate text-center hover:underline">
                  {s.tag}
                </Link>
                <span className="w-14 shrink-0 text-right font-mono tabular-nums">
                  {s.b.wins}–{s.b.losses}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-meta text-muted">{t("people.compare.sides", { a: pa.tag, b: pb.tag })}</p>
        </section>
      )}
      <p className="text-meta text-muted">
        <Link href={`/players/compare?a=${a}`} className="link">{t("people.compare.someoneElse", { tag: pa.tag })}</Link> ·{" "}
        <Link href={`/players/compare?a=${b}`} className="link">{t("people.compare.someoneElse", { tag: pb.tag })}</Link>
      </p>
    </>
  );
}

async function Compare({ searchParams }: { searchParams: PageProps<"/players/compare">["searchParams"] }) {
  const sp = await searchParams;
  const a = typeof sp.a === "string" && ID.test(sp.a) ? sp.a : null;
  const b = typeof sp.b === "string" && ID.test(sp.b) ? sp.b : null;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 40) : "";
  if (!a) redirect("/search?tab=players");
  const [lang, t] = await Promise.all([getLang(), getT()]);
  return <LangProvider lang={lang}>{!b || b === a ? <PickSecond a={a} q={q} t={t} /> : <Comparison a={a} b={b} t={t} lang={lang} />}</LangProvider>;
}

export default function ComparePage(props: PageProps<"/players/compare">) {
  return (
    <article className="flex flex-col gap-4 p-4">
      <Link href="/search?tab=players" className="text-meta text-muted hover:text-foreground"><T k="people.findPlayer" /></Link>
      <Suspense fallback={<CardListSkeleton count={3} label="Loading both players…" />}>
        <Compare searchParams={props.searchParams} />
      </Suspense>
    </article>
  );
}
