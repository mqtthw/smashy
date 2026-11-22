import LocalTime from "@/components/ui/LocalTime";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import RequestAdminButton from "@/components/scenes/RequestAdminButton";
import { EmojiUploadForm, JoinSceneButton } from "@/components/scenes/SceneSocial";
import { getSceneEmojis, getSceneMembers, getSceneMembership } from "@/lib/sceneSocial";
import { getRegionEvents } from "@/lib/events";
import { HOME_REGION, isRegion } from "@/lib/regions";
import Avatar from "@/components/ui/Avatar";
import EditScene from "./EditScene";
import { formatEventDate } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { getScene } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";
import RecentWinners from "@/components/events/RecentWinners";

export async function generateMetadata({ params }: PageProps<"/scenes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getScene(slug).catch(() => null);
  return data ? { title: `${data.scene.name} scene`, description: `Rulesets and info for the ${data.scene.name} smash scene.` } : { title: "Scene not found" };
}

/** Tournaments and expected weeklies in this scene's cities over the next two weeks. */
/** A scene's region (scenes made before regions store a US state code like "TX"). */
function sceneRegionCode(sceneRegion: string): string {
  return isRegion(sceneRegion) ? sceneRegion : isRegion(`US-${sceneRegion}`) ? `US-${sceneRegion}` : HOME_REGION;
}

async function localEvents(cities: string[], region: string) {
  const wanted = cities.map((c) => c.trim().toLowerCase()).filter(Boolean);
  const data = await getRegionEvents(region).catch(() => null);
  if (!data || !wanted.length) return [];
  const now = Date.now() / 1000;
  const inScene = (city: string | null) => !!city && wanted.some((w) => city.toLowerCase().includes(w));
  const soon = (t: number) => t > now - 6 * 3600 && t < now + 14 * 86400;
  return [
    ...data.tournaments.filter((t) => inScene(t.city) && soon(t.startAt)).map((t) => ({ key: t.id, name: t.name, startAt: t.startAt, tz: t.timezone, href: `/events/${t.slug}`, expected: false })),
    ...data.expected.filter((w) => inScene(w.city) && soon(w.startAt)).map((w) => ({ key: w.id, name: w.name, startAt: w.startAt, tz: w.timezone, href: `/events/weekly/${w.id}`, expected: true })),
  ].sort((a, b) => a.startAt - b.startAt).slice(0, 8);
}

/** The scene's tournaments that finished this week (biggest first each day), at most 5. */
async function localResults(cities: string[], region: string) {
  const wanted = cities.map((c) => c.trim().toLowerCase()).filter(Boolean);
  const data = await getRegionEvents(region).catch(() => null);
  if (!data || !wanted.length) return [];
  return data.recent.filter((t) => !!t.city && wanted.some((w) => t.city!.toLowerCase().includes(w))).slice(0, 5);
}

async function SceneDetails({ params }: Pick<PageProps<"/scenes/[slug]">, "params">) {
  const { slug } = await params;
  const userId = await getUserId();
  const [data, t, lang] = await Promise.all([getScene(slug), getT(), getLang()]);
  if (!data) notFound();
  const { scene, admins, rulesets } = data;

  const activeAdmins = admins.filter((a) => a.status === "active");
  const me = admins.find((a) => a.userId === userId);
  const iAmAdmin = me?.status === "active" && scene.status === "active";
  const [membership, emojis] = scene.status === "active"
    ? await Promise.all([getSceneMembership(scene.id, userId), getSceneEmojis(scene.id)])
    : [null, []];
  const [members, events, results] = scene.status === "active" ? await Promise.all([getSceneMembers(scene.id), localEvents(scene.cities, sceneRegionCode(scene.region)), localResults(scene.cities, sceneRegionCode(scene.region))]) : [[], [], []];
  const links = Array.isArray(scene.links) ? scene.links : [];

  return (
    <LangProvider lang={lang}>
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{scene.name}</h1>
          {scene.games.map((g) => <GameBadge key={g} game={g} />)}
          {scene.status !== "active" && <span className="rounded-full border border-dashed border-muted px-2 text-xs text-muted">{t("media.scenes.waiting")}</span>}
        </div>
        <p className="text-muted">{scene.cities.join(", ")}</p>
        {scene.description && <p className="mt-2 whitespace-pre-wrap">{scene.description}</p>}
        {links.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">{l.label} ↗<NewTab /></a>
              </li>
            ))}
          </ul>
        )}
        {membership && (
          <div className="mt-3 flex flex-col gap-1">
            <JoinSceneButton sceneId={scene.id} isMember={membership.isMember} count={membership.count} signedIn={!!userId} />
            {!membership.isMember && <p className="text-meta text-muted">{t("media.scene.joinNote")}</p>}
          </div>
        )}
        {iAmAdmin && (
          <div className="mt-3 flex flex-col">
            <EditScene sceneId={scene.id} description={scene.description} links={links} />
          </div>
        )}
      </header>

      {scene.status === "active" && (
        <section aria-labelledby="scene-events" className="flex flex-col gap-2">
          <h2 id="scene-events" className="font-bold">{t("media.scene.comingUp", { name: scene.name })}</h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted">{t("media.scene.nothingSoon")} <Link href={`/events?region=${encodeURIComponent(sceneRegionCode(scene.region))}`} className="link">{t("media.scene.seeNearby")}</Link></p>
          ) : (
            <ul className="divide-y divide-line card">
              {events.map((e) => (
                <li key={e.key}>
                  <Link href={e.href} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface">
                    <span className="truncate font-semibold">{e.name}</span>
                    <span className="shrink-0 text-sm text-muted">
                      {e.expected && t("media.scene.expected")}
                      {formatEventDate(e.startAt, e.tz, lang)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {results.length > 0 && (
        <section aria-labelledby="scene-results" className="flex flex-col gap-2">
          <h2 id="scene-results" className="font-bold">{t("media.scene.results", { name: scene.name })}</h2>
          <ul className="divide-y divide-line card">
            {results.map((r) => (
              <li key={r.id}>
                <Link href={`/events/${r.slug}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <Suspense fallback={null}>
                      <RecentWinners slug={r.slug} />
                    </Suspense>
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {[formatEventDate(r.startAt, r.timezone, lang), r.numAttendees ? t("browse.recent.players", { n: r.numAttendees }) : null].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {members.length > 0 && (
        <section aria-labelledby="scene-members" className="flex flex-col gap-2">
          <h2 id="scene-members" className="font-bold">{t("media.scene.members")}</h2>
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li key={m.handle}>
                <Link href={`/u/${m.handle}`} className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 text-sm hover:bg-surface">
                  <Avatar name={m.tag} src={m.avatarUrl} size="sm" className="h-6 w-6" />
                  {m.tag}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t("media.scene.rulesets")}</h2>
          {iAmAdmin && (
            <Link href={`/scenes/${scene.slug}/rulesets/new`} className="btn btn-sm btn-inverse">
              {t("media.scene.newRuleset")}
            </Link>
          )}
        </div>
        {rulesets.length === 0 ? (
          <p className="text-sm text-muted">{t("media.scene.noRulesets")}</p>
        ) : (
          <ul className="divide-y divide-line card">
            {rulesets.map((r) => (
              <li key={r.id}>
                <Link href={`/rulesets/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="text-xs text-muted">
                      {GAMES[r.game].short} · v{r.latest?.version ?? 0}
                      {r.latest && <> · {t("media.scene.updated")} <LocalTime iso={r.latest.publishedAt} style="eventDate" /></>}
                    </p>
                  </div>
                  <GameBadge game={r.game} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {scene.status === "active" && (emojis.length > 0 || iAmAdmin) && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">{t("media.scene.emojis")}</h2>
          <p className="text-sm text-muted">{t("media.scene.emojisBody")}</p>
          {emojis.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {emojis.map((e) => (
                <li key={e.id} className={`flex flex-col items-center gap-1 ${e.status === "pending" ? "opacity-60" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.url} alt={`:${e.name}:`} width={36} height={36} className="object-contain" />
                  <span className="font-mono text-meta text-muted">:{e.name}:</span>
                  {e.status === "pending" && <span className="text-meta text-muted">{t("media.scene.emojiWaiting")}</span>}
                </li>
              ))}
            </ul>
          )}
          {iAmAdmin && <EmojiUploadForm sceneId={scene.id} />}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{t("media.scene.admins")}</h2>
        <p className="text-sm text-muted">
          {activeAdmins.length ? activeAdmins.map((a) => a.tag).join(", ") : t("media.scene.noAdmins")} · {t("media.scene.adminsNote")}
        </p>
        {userId && !me && scene.status === "active" && <RequestAdminButton sceneId={scene.id} />}
        {me?.status === "pending" && <p className="text-sm text-muted">{t("media.scene.adminPending")}</p>}
      </section>
    </div>
    </LangProvider>
  );
}

export default function ScenePage(props: PageProps<"/scenes/[slug]">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/scenes" className="pt-2 text-sm text-muted hover:text-foreground"><T k="media.scenes.backToScenes" /></Link>
      <Suspense fallback={<PageSkeleton />}>
        <SceneDetails params={props.params} />
      </Suspense>
    </section>
  );
}
