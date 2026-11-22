import MainBadge from "@/components/MainBadge";
import { badgeMain } from "@/lib/mainBadge";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { ADULT_AGE, ageFromBirthdate } from "@/lib/age";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import TournamentHistory from "@/components/TournamentHistory";
import { unixNow } from "@/lib/format";
import NotificationBadge from "@/components/social/NotificationBadge";
import MessageBadge from "@/components/messages/MessageBadge";
import { avatarUrl } from "@/lib/avatarLinks";
import { getChecklist } from "@/lib/discovery";
import { MEMBER_INVITES, isInviteOnly, listMyInvites } from "@/lib/invites";
import MyInvites from "./MyInvites";
import NotificationSettings from "./NotificationSettings";
import MainIconsToggle from "./MainIconsToggle";
import SpoilerModeToggle from "./SpoilerModeToggle";
import PushToggle from "@/components/push/PushToggle";
import SignOutButton from "@/components/push/SignOutButton";
import MutedWords from "./MutedWords";
import SignInMethods from "./SignInMethods";
import { getMyUpcomingRsvps } from "@/lib/rsvps";
import LocalTime from "@/components/ui/LocalTime";
import { countOpenReports } from "@/lib/moderation";
import { isSiteAdmin } from "@/lib/scenes";
import { getPlayerHistory, getPlayerRecent } from "@/lib/startgg";
import { withFresh } from "@/lib/composerTemplates";
import { createClient, getUserId } from "@/lib/supabase/server";
import { signOut, unlinkStartgg } from "./actions";
import Avatar from "@/components/ui/Avatar";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSwitch from "@/components/LanguageSwitch";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import MajorAlertsToggle from "./MajorAlertsToggle";
import StatsToggle from "./StatsToggle";
import { getLinkedPlayer } from "@/lib/playerStats";
import { PageSkeleton } from "@/components/ui/Skeleton";
import Icon from "@/components/ui/Icon";
import AddBirthday from "@/components/AddBirthday";
import NewTab from "@/components/ui/NewTab";
import { DISCORD_INVITE } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.profile") };
}

function GuestProfile() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold"><T k="profile.guestTitle" /></h1>
      <div className="card p-5">
        <p className="font-semibold"><T k="profile.guest" /></p>
        <p className="mt-1 text-sm text-muted">
          <T k="profile.guestBody" />
        </p>
        <Link href="/signin" className="mt-4 inline-block btn btn-lg btn-primary">
          <T k="signin.pageTitle" />
        </Link>
      </div>
      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-meta font-semibold uppercase tracking-wide text-muted"><T k="lang.label" /></h2>
        <LanguageSwitch />
      </section>
    </div>
  );
}

const LINK_ERRORS: Record<string, MessageKey> = {
  cancelled: "people.profile.linkErr.cancelled",
  expired: "people.profile.linkErr.expired",
  taken: "people.profile.linkErr.taken",
  startgg: "people.profile.linkErr.startgg",
  save: "people.profile.linkErr.save",
  not_configured: "people.profile.linkErr.notConfigured",
};

async function StartggSection({ userId, searchParams }: { userId: string; searchParams: PageProps<"/profile">["searchParams"] }) {
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("startgg_links")
    .select("startgg_user_id, startgg_player_id, gamer_tag, startgg_slug")
    .eq("user_id", userId)
    .maybeSingle();
  const { link_error: linkError, linked } = await searchParams;
  const t = await getT();

  if (!link) {
    return (
      <section className="card p-4">
        <h2 className="mb-1 font-bold">{t("people.profile.history")}</h2>
        <p className="text-sm text-muted">{t("people.profile.linkPitch")}</p>
        {typeof linkError === "string" && (
          <p className="mt-2 text-sm text-danger">{t(LINK_ERRORS[linkError] ?? "people.profile.linkErr.other")}</p>
        )}
        <a href="/link/startgg" className="mt-3 btn btn-md btn-inverse">
          {t("people.profile.linkButton")}
        </a>
      </section>
    );
  }

  const [history, fresh] = await Promise.all([
    getPlayerHistory(link.startgg_user_id).catch((error) => {
      console.error(error);
      return null;
    }),
    // Tonight's events and placements, before the hours-old history has them.
    getPlayerRecent(link.startgg_user_id, link.startgg_player_id).catch(() => []),
  ]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">{t("people.profile.history")}</h2>
        <div className="flex items-center gap-3 text-sm">
          {link.startgg_slug && (
            <a href={`https://www.start.gg/${link.startgg_slug}`} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground">
              {t("people.profile.startggProfile", { tag: link.gamer_tag ?? t("people.profile.startggProfileFallback") })}
            <NewTab /></a>
          )}
          <form action={unlinkStartgg}>
            <button className="text-muted underline">{t("people.profile.unlink")}</button>
          </form>
        </div>
      </div>
      {linked && <p className="rounded-lg bg-surface p-3 text-sm">{t("people.profile.linked")}</p>}
      {history ? (
        <TournamentHistory
          initial={withFresh(history.entries, fresh)}
          initialHasMore={history.totalPages > 1}
          total={history.total}
          now={unixNow()}
        />
      ) : (
        <p className="text-sm text-muted">{t("people.profile.historyFailed")}</p>
      )}
      <p className="text-xs text-muted">{t("people.profile.onlyYou")}</p>
    </section>
  );
}

/** Private beta: the member's own invite codes. */
async function Invites({ userId }: { userId: string }) {
  if (!(await isInviteOnly()) || (await isSiteAdmin(userId))) return null; // admins use Admin > Invites
  const codes = await listMyInvites(userId);
  return <MyInvites codes={codes} max={MEMBER_INVITES} />;
}

/** New players: a short getting-started list (gone once everything's done). */
async function Checklist({ userId, linked }: { userId: string; linked: boolean }) {
  const items = await getChecklist(userId, linked);
  if (!items.length) return null;
  const done = items.filter((i) => i.done).length;
  const t = await getT();
  return (
    <section aria-labelledby="getting-started" className="card flex flex-col gap-2 p-4">
      <h2 id="getting-started" className="font-bold">{t("people.profile.gettingStarted")} <span className="text-meta font-normal text-muted">{t("people.profile.doneOf", { done, total: items.length })}</span></h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((i) => (
          <li key={i.key}>
            {i.done ? (
              <span className="text-muted line-through">✓ {t(`checklist.${i.key}` as MessageKey)}</span>
            ) : (
              <Link href={i.href} className="text-brand hover:underline">○ {t(`checklist.${i.key}` as MessageKey)}</Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

async function SignInMethodsFromParams({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  const { signin_link: linked, signin_link_error: linkError, email_change: emailChange } = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return <SignInMethods linked={one(linked)} linkError={one(linkError)} emailChange={one(emailChange)} />;
}

async function ProfileContent({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  const userId = await getUserId();
  const lang = await getLang();
  if (!userId) return <LangProvider lang={lang}><GuestProfile /></LangProvider>;
  const t = await getT();

  const supabase = await createClient();
  const [{ data: profile }, { data: privateData }, linked, { data: muted }, going] = await Promise.all([
    supabase.from("profiles").select("tag, handle, home_city, games, bio, notify_majors, avatar_path, notification_mutes, mains").eq("id", userId).maybeSingle(),
    supabase.from("private_profile_data").select("date_of_birth").eq("user_id", userId).maybeSingle(),
    getLinkedPlayer(userId).catch(() => null),
    supabase.from("muted_words").select("words").eq("user_id", userId).maybeSingle(),
    getMyUpcomingRsvps(userId),
  ]);
  if (!profile) redirect("/welcome");

  const isMinor = privateData ? ageFromBirthdate(privateData.date_of_birth) < ADULT_AGE : true;
  const games = (profile.games as string[]).filter((g): g is GameKey => GAME_KEYS.includes(g as GameKey));

  return (
    <LangProvider lang={lang}>
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-4">
        {/* The profile picture in a glossy bubble ring (round 504). */}
        <span className="portrait-bubble h-20 w-20">
          <Avatar name={profile.tag} src={avatarUrl(profile.avatar_path)} size="lg" />
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><span className="truncate">{profile.tag}</span><MainBadge main={badgeMain(profile.mains)} size="md" /></h1>
          <p className="text-muted">@{profile.handle}{profile.home_city && ` · ${profile.home_city}`}</p>
        </div>
      </div>
      {profile.bio && <p className="whitespace-pre-wrap break-words">{profile.bio}</p>}
      <Suspense fallback={null}>
        <Checklist userId={userId} linked={!!linked} />
      </Suspense>
      <div className="flex gap-2 text-sm">
        <Link href={`/u/${profile.handle}`} className="btn btn-sm btn-outline">
          {t("people.profile.viewPublic")}
        </Link>
        <Link href="/profile/edit" className="btn btn-sm btn-outline">{t("people.profile.edit")}</Link>
      </div>

      {/* Your notifications, messages, saved posts and sets, up top (round 511): they were at the very
          bottom, under all the settings. Sign out stays at the bottom. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/notifications" className="flex items-center gap-1 text-muted underline"><Icon name="bell" /> {t("people.profile.notifications")}<NotificationBadge /></Link>
        <Link href="/messages" className="flex items-center gap-1 text-muted underline"><Icon name="mail" /> {t("nav.messages")}<MessageBadge /></Link>
        <Link href="/saved" className="flex items-center gap-1 text-muted underline"><Icon name="bookmark" /> {t("people.profile.saved")}</Link>
        <Link href="/my-sets" className="flex items-center gap-1 text-muted underline"><Icon name="gamepad" /> {t("people.profile.mySets")}</Link>
        {(await isSiteAdmin(userId)) && (
          <Link href="/admin" className="font-semibold text-brand">
            {await countOpenReports().then((n) => (n ? t("people.profile.siteAdminReports", { n }) : t("people.profile.siteAdmin")))}
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {games.map((g) => <GameBadge key={g} game={g} />)}
      </div>

      {!privateData && <AddBirthday currentYear={new Date().getFullYear()} />}
      {isMinor && privateData && (
        <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
          {t("people.profile.minor")}
        </p>
      )}

      {going.length > 0 && (
        <section aria-labelledby="going-to" className="card flex flex-col gap-2 p-4">
          <h2 id="going-to" className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.profile.goingTo")}</h2>
          <ul className="flex flex-col gap-1">
            {going.map((g) => (
              <li key={g.href + g.startsAt}>
                <Link href={g.href} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
                  <span className="truncate font-semibold"><Icon name="calendar" /> {g.name}</span>
                  <span className="shrink-0 text-sm text-muted"><LocalTime iso={g.startsAt} style="dayDateTime" zone /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comes from start.gg: it fills in on its own instead of holding up the whole page (round 554). */}
      <Suspense fallback={<div className="card h-32 animate-pulse" />}>
        <StartggSection userId={userId} searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={null}>
        <Invites userId={userId} />
      </Suspense>

      <Suspense fallback={<div className="card h-28 animate-pulse" />}>
        <SignInMethodsFromParams searchParams={searchParams} />
      </Suspense>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-meta font-semibold uppercase tracking-wide text-muted"><T k="lang.label" /></h2>
        <LanguageSwitch />
        <p className="text-meta text-muted"><T k="lang.note" /></p>
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.profile.theme")}</h2>
        <ThemeToggle />
        <MainIconsToggle />
        <SpoilerModeToggle />
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.profile.notifications")}</h2>
        <PushToggle />
        <MajorAlertsToggle on={Boolean(profile.notify_majors)} />
        <NotificationSettings muted={(profile.notification_mutes as string[] | null) ?? []} />
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.profile.yourFeed")}</h2>
        <MutedWords words={(muted?.words as string[] | undefined) ?? []} />
      </section>

      {linked && (
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.profile.privacy")}</h2>
          <StatsToggle on={linked.showStats} />
          <Link href={`/u/${profile.handle}?tab=stats`} className="link self-start text-meta">{t("people.profile.seeStats")}</Link>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <SignOutButton action={signOut} />
      </div>
      <p className="flex flex-wrap gap-4 text-meta text-muted">
        <Link href="/privacy" className="underline">{t("people.profile.privacy")}</Link>
        <Link href="/terms" className="underline">{t("signin.terms")}</Link>
        <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="underline">{t("people.profile.discord")} ↗</a>
        <a href="/profile/export" className="underline" download>{t("people.profile.download")}</a>
        <Link href="/profile/delete" className="underline">{t("people.profile.delete")}</Link>
      </p>
    </div>
    </LangProvider>
  );
}

export default function ProfilePage(props: PageProps<"/profile">) {
  return (
    <Suspense fallback={<div className="p-4"><PageSkeleton /></div>}>
      <ProfileContent searchParams={props.searchParams} />
    </Suspense>
  );
}
