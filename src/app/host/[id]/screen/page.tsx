// The venue screen: a page for the TV or projector at a local. Big text, dark, no menus. It shows
// which sets to play now and on which setup, what's up next, and (when it's over) the results. It
// updates itself as the TO calls sets and players report. Before the bracket starts it shows the
// QR code to sign up. Only shows what the bracket page already shows to everyone.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import BracketLive from "@/components/host/BracketLive";
import ScreenTools from "@/components/host/ScreenTools";
import Icon from "@/components/ui/Icon";
import LiveDot from "@/components/ui/LiveDot";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { GAMES } from "@/lib/games";
import { bracketParts, bracketPlayers, bracketResults, liveGameScores, loadEngineSets, pickPart, setStations, toBracket } from "@/lib/hostedBracket";
import { getHostedEvent, formatSummary } from "@/lib/hostedEvents";
import { siteUrl } from "@/lib/siteMeta";
import { isStreamSetup } from "@/lib/streamSet";
import { getLang, getT } from "@/lib/i18n/server";
import { localRound } from "@/lib/i18n/rounds";
import { ordinalFor } from "@/lib/i18n/ordinal";
import { screenLists, type ScreenRow } from "@/lib/venueScreen";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("event.screen.title"), robots: { index: false, follow: false } };
}

const MAX_NOW = 10;
const MAX_NEXT = 8;

async function qrFor(link: string): Promise<string> {
  // Made on the server from the event's own address (markup from the qrcode library).
  return QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
}

function Qr({ svg, label, caption }: { svg: string; label: string; caption: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 text-center">
      <div className="w-32 rounded-lg bg-white p-1.5 md:w-44 xl:w-56" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="max-w-56 text-sm text-muted md:text-base">{caption}</p>
    </div>
  );
}

async function Screen({ params }: { params: PageProps<"/host/[id]/screen">["params"] }) {
  const { id } = await params;
  // In the language of whoever opens it (the TO, on the venue's TV).
  const [event, t, lang] = await Promise.all([getHostedEvent(id), getT(), getLang()]);
  if (!event || event.removed) notFound();
  const ordinal = (n: number) => ordinalFor(lang, n);
  const origin = siteUrl().origin;
  const sets = event.status === "canceled" ? [] : await loadEngineSets(event.id);
  const started = sets.length > 0;
  const shell = "board fixed inset-0 z-50 flex flex-col gap-6 overflow-auto rounded-none border-0 p-5 md:gap-8 md:p-8 xl:p-12";
  const head = (status: React.ReactNode) => (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-black leading-tight md:text-5xl xl:text-6xl">{event.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted md:text-2xl">
          <span>
            {GAMES[event.game].name} · {formatSummary(event, t)}
          </span>
          {status}
        </p>
      </div>
      <ScreenTools backHref={`/host/${event.id}`} timeZone={event.timezone} />
    </header>
  );

  // Before the bracket: how to get in.
  if (!started) {
    const canceled = event.status === "canceled";
    const qr = canceled ? null : await qrFor(`${origin}/host/${event.id}`);
    return (
      <div className={shell}>
        {!canceled && <BracketLive eventId={event.id} safetyMs={30_000} />}
        {head(<span>{canceled ? t("event.screen.canceled") : t("event.screen.signedUp", { n: event.entrantCount })}</span>)}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          {qr ? (
            <>
              <div className="w-64 max-w-full rounded-2xl bg-white p-3 md:w-80 xl:w-96" role="img" aria-label={t("event.poster.qr")} dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="text-3xl font-black md:text-5xl">{t(event.checkinMinutes > 0 ? "event.poster.scanCheckIn" : "event.poster.scan")}</p>
              <p className="text-lg text-muted md:text-2xl">{t("event.screen.waiting")}</p>
            </>
          ) : (
            <p className="text-3xl font-black md:text-5xl">{t("event.screen.wasCanceled")}</p>
          )}
        </div>
      </div>
    );
  }

  const players = await bracketPlayers(event.id);
  const tag = (pid: string | null) => (pid ? (players.get(pid)?.tag ?? t("event.overlay.player")) : t("event.overlay.tbd"));
  const pools = [...new Set(sets.map((s) => s.pool).filter((p): p is number => p !== null))].sort((a, b) => a - b);
  // The parts of the bracket (pools, and the final bracket after them); "finished" is about the whole event.
  const parts = bracketParts(event, sets);
  const finished = toBracket(event, sets, players, pickPart(parts)).finished;
  // What each set is called on the bracket ("Winners Semi-Final"), by set id.
  const roundOf = new Map<string, string>();
  for (const part of parts.length ? parts : [{ label: "", pool: null }])
    for (const r of toBracket(event, sets, players, part.pool).rounds) for (const x of r.sets) roundOf.set(x.id, parts.length > 1 && part.pool !== null ? `${localRound(part.label, t)} · ${localRound(r.label, t)}` : localRound(r.label, t));
  const bracketQr = await qrFor(`${origin}/host/${event.id}/bracket`);

  if (finished || event.status === "completed") {
    const results = bracketResults(event, sets);
    const place = "w-16 shrink-0 font-mono text-xl tabular-nums md:w-28 md:text-3xl";
    const name = "min-w-0 flex-1 truncate text-2xl font-bold md:text-4xl xl:text-5xl";
    return (
      <div className={shell}>
        {head(<span>{t("event.screen.finished")}</span>)}
        <div className="flex flex-1 flex-wrap items-start gap-8">
          <section className="min-w-0 flex-1 basis-96 text-lg md:text-2xl" aria-labelledby="screen-results">
            <h2 id="screen-results" className="mb-3 text-xl font-bold uppercase tracking-wide text-muted md:text-2xl">{results.kind !== "elimination" ? t("event.pic.standings") : t("event.screen.results")}</h2>
            {results.kind === "swiss" ? (
              <ol className="divide-y divide-line">
                {results.standings.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-baseline gap-4 py-2 md:gap-6 md:py-3">
                    <span className={`${place} ${r.rank <= 3 ? "text-brand" : "text-muted"}`}>{ordinal(r.rank)}</span>
                    <span className={name}>{tag(r.id)}</span>
                    <span className="shrink-0 font-mono text-lg tabular-nums text-muted md:text-2xl">
                      {r.wins}–{r.losses}
                    </span>
                  </li>
                ))}
              </ol>
            ) : results.kind === "elimination" ? (
              <ol className="divide-y divide-line">
                {results.placements.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-baseline gap-4 py-2 md:gap-6 md:py-3">
                    <span className={`${place} ${r.place <= 3 ? "text-brand" : "text-muted"}`}>{ordinal(r.place)}</span>
                    <span className={name}>{tag(r.id)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              // One list per pool, side by side when there's room (places are within the pool).
              <div className={`grid gap-x-12 gap-y-6 ${pools.length > 1 ? "lg:grid-cols-2" : ""}`}>
                {[...new Set(results.standings.map((r) => r.pool))].map((pool) => (
                  <div key={pool} className="min-w-0">
                    {pools.length > 1 && <h3 className="text-lg font-bold text-muted md:text-2xl">{t("event.screen.pool", { n: pool ?? "" })}</h3>}
                    <ol className="divide-y divide-line">
                      {results.standings
                        .filter((r) => r.pool === pool)
                        .slice(0, 8)
                        .map((r) => (
                          <li key={r.id} className="flex items-baseline gap-4 py-2 md:gap-6 md:py-3">
                            <span className={`${pools.length > 1 ? "w-12 shrink-0 font-mono text-lg tabular-nums md:w-20 md:text-2xl" : place} ${r.place === 1 ? "text-brand" : "text-muted"}`}>{ordinal(r.place)}</span>
                            <span className={pools.length > 1 ? "min-w-0 flex-1 truncate text-xl font-bold md:text-3xl" : name}>{tag(r.id)}</span>
                            <span className="shrink-0 font-mono text-lg tabular-nums text-muted md:text-2xl">
                              {r.wins}–{r.losses}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </section>
          <Qr svg={bracketQr} label={t("event.screen.qrBracket")} caption={t("event.screen.scanFull")} />
        </div>
      </div>
    );
  }

  const [stations, scores] = await Promise.all([setStations(event.id).catch(() => ({}) as Record<string, string>), liveGameScores(event.id).catch(() => ({}) as Record<string, [number, number]>)]);
  const { now, next, later } = screenLists(sets, stations);
  const playing = now.filter((r) => r.live).length;

  const NowRow = ({ r }: { r: ScreenRow }) => {
    const s = r.set;
    const score = r.live ? scores[s.key] : undefined;
    return (
      <li className="flex items-center gap-4 py-3 md:gap-6 md:py-4">
        <span className={`w-28 shrink-0 text-xl font-black leading-tight md:w-44 md:text-3xl xl:w-60 xl:text-4xl ${r.setup ? "text-brand" : "text-muted"}`}>
          {isStreamSetup(r.setup ?? undefined) && (
            <span className="hidden md:inline">
              <Icon name="video" label={t("event.screen.onStream")} className="mr-2" />
            </span>
          )}
          {r.setup ?? t("event.screen.inPlay")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-2xl font-bold md:text-4xl xl:text-5xl">
            {tag(s.p[0].id)} <span className="font-normal text-muted">vs</span> {tag(s.p[1].id)}
          </span>
          <span className="block truncate text-sm text-muted md:text-xl">
            {t("event.comm.setId", { id: s.identifier ?? "" })} · {roundOf.get(s.key) ?? ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {score ? (
            <span className="font-mono text-3xl font-black tabular-nums md:text-5xl">
              {score[0]}–{score[1]}
            </span>
          ) : r.live ? (
            r.setup && <span className="text-lg font-semibold md:text-2xl">{t("event.screen.playing")}</span>
          ) : (
            <span className="text-lg font-semibold text-warning md:text-2xl">{t("event.screen.goPlay")}</span>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className={shell}>
      <BracketLive eventId={event.id} />
      {head(playing > 0 ? <LiveDot>{t("event.screen.live", { n: playing })}</LiveDot> : <span>{t("event.screen.inProgress")}</span>)}
      <div className="flex flex-1 flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-1 basis-[36rem] flex-col gap-8">
          <section aria-labelledby="screen-now">
            <h2 id="screen-now" className="text-xl font-bold uppercase tracking-wide text-muted md:text-2xl">{t("event.screen.playNow")}</h2>
            {now.length ? (
              <ul className="divide-y divide-line">
                {now.slice(0, MAX_NOW).map((r) => (
                  <NowRow key={r.set.key} r={r} />
                ))}
              </ul>
            ) : (
              <p className="py-3 text-2xl text-muted md:text-3xl">{t("event.screen.noneCalled")}</p>
            )}
            {now.length > MAX_NOW && <p className="text-muted md:text-xl">{t("event.screen.moreNow", { n: now.length - MAX_NOW })}</p>}
          </section>
          {next.length > 0 && (
            <section aria-labelledby="screen-next">
              <h2 id="screen-next" className="text-xl font-bold uppercase tracking-wide text-muted md:text-2xl">{t("event.screen.upNext")}</h2>
              <ul className="grid gap-x-10 md:grid-cols-2">
                {next.slice(0, MAX_NEXT).map((r) => (
                  <li key={r.set.key} className="flex items-baseline gap-3 border-b border-line py-2 md:py-3">
                    <span className="w-8 shrink-0 font-mono text-muted md:text-xl">{r.set.identifier}</span>
                    <span className="min-w-0 flex-1 truncate text-xl font-semibold md:text-3xl">
                      {tag(r.set.p[0].id)} <span className="font-normal text-muted">vs</span> {tag(r.set.p[1].id)}
                    </span>
                  </li>
                ))}
              </ul>
              {next.length - MAX_NEXT + later > 0 && <p className="mt-2 text-muted md:text-xl">{t("event.screen.moreLater", { n: Math.max(0, next.length - MAX_NEXT) + later })}</p>}
            </section>
          )}
        </div>
        <Qr svg={bracketQr} label={t("event.screen.qrBracket")} caption={t("event.screen.scanReport")} />
      </div>
    </div>
  );
}

export default function VenueScreenPage(props: PageProps<"/host/[id]/screen">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Screen params={props.params} />
    </Suspense>
  );
}
