// The bracket for another website: a TO pastes an iframe that points here. No menus, nothing that
// changes anything, and only what the bracket page already shows to everyone. It updates itself, and
// links to the rest of Smashy open in a new tab. This is the only page other sites may put in a
// frame (next.config.ts leaves the "no framing" headers off this one address).
import { getLang, getT } from "@/lib/i18n/server";
import { isLang, translate, type Lang, type MessageKey, type Values } from "@/lib/i18n/core";
import { LangProvider } from "@/lib/i18n/client";
import { localRound } from "@/lib/i18n/rounds";

type Tr = (key: MessageKey, values?: Values) => string;
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import BracketView from "@/components/brackets/BracketView";
import GameBadge from "@/components/GameBadge";
import BracketLive from "@/components/host/BracketLive";
import EmbedLinks from "@/components/host/EmbedLinks";
import OnNow from "@/components/host/OnNow";
import Results from "@/components/host/Results";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { bracketParts, bracketPlayers, bracketResults, firstPartResults, liveGameScores, loadEngineSets, pickPart, setStations, toBracket } from "@/lib/hostedBracket";
import { getHostedEvent, formatSummary } from "@/lib/hostedEvents";
import NewTab from "@/components/ui/NewTab";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("event.embed.title"), robots: { index: false, follow: false } };
}

// Covers the site's own layout (the menus are also hidden for this page in globals.css).
const shell = "fixed inset-0 z-50 flex flex-col overflow-auto bg-background";

// The embed follows each visitor's light or dark setting. A TO whose website is always one of the
// two can pin it: /embed?theme=dark (or light). Runs before the bracket is drawn.
const themeScript = `try{var t=new URLSearchParams(location.search).get("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

function Foot({ eventId, t }: { eventId: string; t: Tr }) {
  return (
    <p className="mt-auto border-t border-line px-4 py-2 text-meta text-muted">
      {t("event.embed.runOn")}{" "}
      <a href={`/host/${eventId}`} target="_blank" rel="noopener" className="link">
        Smashy
      <NewTab /></a>
      {t("event.embed.free")}
    </p>
  );
}

async function Embed({ params, searchParams }: PageProps<"/host/[id]/embed">) {
  const [{ id }, { group, theme, lang: langParam }] = await Promise.all([params, searchParams]);
  // The visitor's own language (an embed on another site usually has no Smashy cookie, so their
  // browser's), or one the TO pins with ?lang= for a site in one language.
  const lang: Lang = isLang(langParam) ? langParam : await getLang();
  const t: Tr = (key, values) => translate(lang, key, values);
  const keepLang = isLang(langParam) ? `&lang=${langParam}` : "";
  const keepTheme = theme === "dark" || theme === "light" ? `&theme=${theme}` : "";
  const event = await getHostedEvent(id).catch(() => null);
  if (!event || event.removed) {
    // Not the site's "Page not found": that page brings its menus into the frame.
    return <p className="p-4 text-muted">{t("event.embed.missing")}</p>;
  }
  const sets = event.status === "canceled" ? [] : await loadEngineSets(event.id);
  const title = (status: React.ReactNode) => (
    <header className="flex flex-col gap-1 px-4 pt-4">
      <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
        <a href={`/host/${event.id}`} target="_blank" rel="noopener" className="hover:underline">
          {event.name}
        <NewTab /></a>
        <GameBadge game={event.game} />
      </h1>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">{status}</p>
    </header>
  );

  if (!sets.length) {
    const open = event.status !== "canceled" && event.status !== "completed";
    return (
      <LangProvider lang={lang}>
        {open && <BracketLive eventId={event.id} />}
        {title(
          <span>
            {formatSummary(event, t)} · {event.status === "canceled" ? t("event.screen.canceled") : t("event.screen.signedUp", { n: event.entrantCount })}
          </span>,
        )}
        <div className="flex flex-col items-start gap-3 p-4">
          <p className="text-muted">{event.status === "canceled" ? t("event.screen.wasCanceled") : t("event.embed.waiting")}</p>
          {open && (
            <a href={`/host/${event.id}`} target="_blank" rel="noopener" className="btn btn-primary">
              {t("event.embed.signUp")}
            <NewTab /></a>
          )}
        </div>
        <Foot eventId={event.id} t={t} />
      </LangProvider>
    );
  }

  const players = await bracketPlayers(event.id);
  // The parts to pick between: several pools, or pools/Swiss and the final bracket (shown by default once it exists).
  const parts = bracketParts(event, sets);
  const pool = pickPart(parts, typeof group === "string" ? group : null);
  const bracket = toBracket(event, sets, players, pool);
  const running = event.status === "in_progress" && !bracket.finished;
  const [stations, liveScores] = running
    ? await Promise.all([setStations(event.id).catch(() => ({}) as Record<string, string>), liveGameScores(event.id).catch(() => ({}) as Record<string, [number, number]>)])
    : [{} as Record<string, string>, {} as Record<string, [number, number]>];
  // The same marks as the bracket page: the setup a set is called to, and the games so far in a set being played.
  for (const r of bracket.rounds)
    for (const x of r.sets) {
      if (stations[x.id]) x.setup = stations[x.id];
      const games = x.state === "live" ? liveScores[x.id] : undefined;
      if (games) x.players.forEach((p, i) => p && (p.score = games[i]));
    }
  const count = new Set(sets.flatMap((s) => s.p.map((x) => x.id).filter(Boolean))).size;

  return (
    <LangProvider lang={lang}>
      {event.status === "in_progress" && <BracketLive eventId={event.id} />}
      {title(
        <span>
          {formatSummary(event, t)} · {t("event.pic.players", { n: count })}{bracket.finished ? ` · ${t("event.screen.finished")}` : ""}
        </span>,
      )}
      {parts.length > 1 && (
        <nav aria-label={t("event.embed.parts")} className="flex flex-wrap gap-2 px-4 pt-3">
          {parts.map((p) => (
            <Link key={p.id} href={`/host/${event.id}/embed?group=${p.id}${keepTheme}${keepLang}`} aria-current={p.pool === pool ? "page" : undefined} className="chip">
              {localRound(p.label, t)}
            </Link>
          ))}
        </nav>
      )}
      {(bracket.finished || (pool !== null || !sets.some((s) => s.bracket !== "RR" && s.bracket !== "SW") ? firstPartResults(event, sets) : null) !== null) && (
        <section className="flex flex-col gap-2 px-4 pt-4" aria-labelledby="embed-results">
          <h2 id="embed-results" className="font-bold">
            {bracket.finished ? t("event.screen.results") : t("event.embed.standings")}
          </h2>
          <Results results={bracket.finished ? bracketResults(event, sets) : (firstPartResults(event, sets) ?? bracketResults(event, sets))} players={players} limit={bracket.finished ? 8 : undefined} />
        </section>
      )}
      {running && <OnNow sets={sets} scores={liveScores} stations={stations} tagOf={(pid) => (pid ? (players.get(pid)?.tag ?? t("event.overlay.player")) : t("event.overlay.tbd"))} className="mx-4 mt-4" />}
      <div className="pt-4">
        <BracketView bracket={bracket} />
      </div>
      <Foot eventId={event.id} t={t} />
    </LangProvider>
  );
}

export default function HostedBracketEmbedPage(props: PageProps<"/host/[id]/embed">) {
  return (
    <div data-embed className={shell}>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <EmbedLinks />
      <Suspense fallback={<CardListSkeleton label="Loading bracket…" className="p-4" />}>
        <Embed params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
