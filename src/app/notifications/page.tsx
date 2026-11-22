import LocalTime from "@/components/ui/LocalTime";
import { localAlert, pingCharacter } from "@/lib/pushText";
import MainBadge from "@/components/MainBadge";
import type { Metadata } from "next";
import Link from "next/link";
import PushToggle from "@/components/push/PushToggle";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import { acceptFollowRequest, removeFollower } from "@/app/follow-actions";
import MarkRead from "@/components/social/MarkRead";
import FollowButton from "@/components/social/FollowButton";
import Avatar from "@/components/ui/Avatar";
import { getFollowRequests } from "@/lib/follows";
import { getNotifications, groupNotifications, type NotificationItem } from "@/lib/notifications";
import { createClient, getUserId } from "@/lib/supabase/server";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import TabBar from "@/components/ui/TabBar";
import Icon from "@/components/ui/Icon";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { GAMES, type GameKey } from "@/lib/games";

// Events: brackets, check-in, results, majors and weekly digests. Social: everything else.
const EVENT_TYPES = new Set(["major_live", "event_reminder", "weekly_digest", "set_ready", "event_result", "event_update", "ladder_match", "play_ping", "play_ping_main", "play_request", "play_accepted"]);
type Filter = "all" | "events" | "social";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.notifications"), robots: { index: false } };
}


/** Play alerts store the game's key; show its short name. */
const gameShort = (key: string | undefined) => (key && key in GAMES ? GAMES[key as GameKey].short : "smash");

function describe(n: NotificationItem, t: (key: MessageKey, values?: Values) => string): { icon: React.ReactNode; text: string; href: string } {
  const someone = t("setroom.notif.someone");
  const grouped = ["like", "repost", "vote"].includes(n.type);
  const withOthers = (name: string) => (n.others ? t("setroom.notif.andOthers", { name, n: n.others }) : name);
  const who = grouped ? withOthers(n.actor?.tag ?? someone) : (n.actor?.tag ?? someone);
  // How many people did it (picks the plural verb where the language has one).
  const people = { n: 1 + (n.others ?? 0) };
  const postHref = n.post ? `/post/${n.post.parentId ?? n.post.id}` : "/";
  switch (n.type) {
    case "follow": return { icon: <Icon name="user" />, text: t("setroom.notif.follow", { who }), href: `/u/${n.actor?.handle ?? ""}` };
    case "follow_request": return { icon: <Icon name="lock" />, text: t("setroom.notif.followRequest", { who }), href: `/u/${n.actor?.handle ?? ""}` };
    case "follow_accepted": return { icon: <Icon name="check" />, text: t("setroom.notif.followAccepted", { who }), href: `/u/${n.actor?.handle ?? ""}` };
    case "like": return { icon: <Icon name="heart" />, text: t("setroom.notif.like", { who, ...people }), href: postHref };
    case "reply": return { icon: <Icon name="chat" />, text: t("setroom.notif.reply", { who }), href: postHref };
    case "repost": return { icon: <Icon name="repeat" />, text: t("setroom.notif.repost", { who, ...people }), href: postHref };
    case "quote": return { icon: <Icon name="chat" />, text: t("setroom.notif.quote", { who }), href: postHref };
    case "vote": return { icon: "▲", text: n.highlight ? t("setroom.notif.voteTitle", { who, title: n.highlight.title, ...people }) : t("setroom.notif.voteHighlight", { who, ...people }), href: n.highlight ? `/h/${n.highlight.id}` : "/" };
    case "scene_approved": return { icon: <Icon name="check" />, text: t("setroom.notif.sceneApproved", { scene: n.scene?.name ?? "" }), href: n.scene ? `/scenes/${n.scene.slug}` : "/scenes" };
    case "scene_rejected": return { icon: "ℹ️", text: t("setroom.notif.sceneRejected", { scene: n.scene?.name ?? "" }), href: "/scenes" };
    case "admin_approved": return { icon: <Icon name="check" />, text: t("setroom.notif.adminApproved", { scene: n.scene?.name ?? t("setroom.notif.aScene") }), href: n.scene ? `/scenes/${n.scene.slug}` : "/scenes" };
    case "major_live": return { icon: <Icon name="play" />, text: t("setroom.notif.majorLive", { major: n.major?.name ?? t("setroom.notif.aMajor") }), href: n.major ? `/events/${n.major.slug}#watch` : "/events" };
    case "reaction": {
      const emoji = n.emoji && !n.emoji.startsWith("scene:") ? n.emoji : t("setroom.notif.sceneEmoji");
      return { icon: n.emoji && !n.emoji.startsWith("scene:") ? n.emoji : "😊", text: t("setroom.notif.reaction", { who: withOthers(n.actor?.tag ?? someone), emoji, ...people }), href: postHref };
    }
    case "mention": return { icon: "@", text: t("setroom.notif.mention", { who: n.actor?.tag ?? someone }), href: postHref };
    case "message_request": return { icon: <Icon name="mail" />, text: t("setroom.notif.messageRequest", { who: n.actor?.tag ?? someone }), href: n.conversationId ? `/messages/${n.conversationId}` : "/messages?tab=requests" };
    case "clip_approved": return { icon: <Icon name="play" />, text: n.clip?.title ? t("setroom.notif.clipApprovedTitle", { title: n.clip.title }) : t("setroom.notif.clipApproved"), href: n.clip ? `/reels/${encodeURIComponent(n.clip.clipId)}` : "/reels" };
    case "clip_rejected": return { icon: "ℹ️", text: n.clip?.title ? t("setroom.notif.clipRejectedTitle", { title: n.clip.title }) : t("setroom.notif.clipRejected"), href: "/reels/share" };
    // The stored sentence (event_name) is shown as it was written.
    case "event_update": return { icon: <Icon name="megaphone" />, text: (n.event?.name ?? t("setroom.notif.eventChanged")).replace(/([^.!?。！？])$/, "$1."), href: n.event?.href ?? "/events" };
    case "event_result": return { icon: <Icon name="trophy" />, text: t("setroom.notif.placed", { event: n.event?.name ?? t("setroom.notif.inAnEvent") }), href: n.event?.href ?? "/events" };
    case "ladder_match": {
      const what = n.event?.name ? localAlert(n.event.name, t) : t("setroom.notif.yourLadderMatch");
      return { icon: <Icon name="gamepad" />, text: n.actor ? t("setroom.notif.ladderWith", { what, name: n.actor.tag }) : t("setroom.notif.ladder", { what }), href: n.event?.href ?? "/ladder" };
    }
    case "play_ping": return { icon: <Icon name="gamepad" />, text: t("playnow.notif.ping", { who: n.actor?.tag ?? someone, game: gameShort(n.event?.name) }), href: n.event?.href ?? "/play" };
    case "play_ping_main": return { icon: <Icon name="gamepad" />, text: t("playnow.notif.pingMain", { who: n.actor?.tag ?? someone, character: pingCharacter(n.event?.name, n.event?.href), game: gameShort(n.event?.name) }), href: n.event?.href ?? "/play" };
    case "play_request": return { icon: <Icon name="gamepad" />, text: t("playnow.notif.request", { who: n.actor?.tag ?? someone, game: gameShort(n.event?.name) }), href: n.event?.href ?? "/play" };
    case "play_accepted": return { icon: <Icon name="check" />, text: t("playnow.notif.accepted", { who: n.actor?.tag ?? someone, game: gameShort(n.event?.name) }), href: n.event?.href ?? "/play" };
    case "set_ready": return { icon: <Icon name="gamepad" />, text: t("setroom.notif.setReady", { what: n.event?.name ?? t("setroom.notif.yourSetReady") }), href: n.event?.href ?? "/events" };
    case "weekly_digest": return { icon: <Icon name="calendar" />, text: t("setroom.notif.digest", { what: n.event?.name ?? t("setroom.notif.thisWeek") }), href: n.event?.href ?? "/events" };
    case "event_reminder": return { icon: <Icon name="calendar" />, text: t("setroom.notif.reminder", { what: n.event?.name ?? t("setroom.notif.anEventYoureGoingTo") }), href: n.event?.href ?? "/events" };
    case "admin_rejected": return { icon: "ℹ️", text: t("setroom.notif.adminRejected", { scene: n.scene?.name ?? t("setroom.notif.aScene") }), href: "/scenes" };
  }
}

async function Inbox({ searchParams }: { searchParams: PageProps<"/notifications">["searchParams"] }) {
  const userId = await getUserId();
  if (!userId) redirect(signInPath("/notifications"));
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const { tab } = await searchParams;
  const filter: Filter = tab === "events" || tab === "social" ? tab : "all";
  // "Follow back" for new followers you don't follow yet: everyone you follow (or asked to) is read
  // alongside the notifications (round 674; it used to wait for them).
  const supabase = await createClient();
  const [requests, raw, { data: mine }] = await Promise.all([
    getFollowRequests(userId),
    getNotifications(userId),
    supabase.from("follows").select("followee_id").eq("follower_id", userId).limit(5000),
  ]);
  const items = groupNotifications(raw).filter((n) => filter === "all" || (filter === "events") === EVENT_TYPES.has(n.type));
  const followingBack = new Set((mine ?? []).map((f) => f.followee_id as string));

  return (
    <LangProvider lang={lang}>
      <MarkRead />
      <TabBar
        label={t("setroom.notif.types")}
        active={filter}
        tabs={[
          { key: "all", label: t("setroom.notif.all"), href: "/notifications" },
          { key: "events", label: t("setroom.notif.events"), href: "/notifications?tab=events" },
          { key: "social", label: t("setroom.notif.social"), href: "/notifications?tab=social" },
        ]}
      />
      <PushToggle compact />
      {requests.length > 0 && filter !== "events" && (
        <section className="flex flex-col gap-2 border-b border-line p-4">
          <h2 className="font-bold">{t("setroom.notif.requests")}</h2>
          {requests.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Link href={`/u/${p.handle}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.tag}</span>
                <span className="block truncate text-sm text-muted">@{p.handle}</span>
              </Link>
              <form action={acceptFollowRequest.bind(null, p.id)}>
                <button className="btn btn-sm btn-inverse">{t("setroom.notif.accept")}</button>
              </form>
              <form action={removeFollower.bind(null, p.id)}>
                <button className="rounded-full border border-line px-3 py-1 text-sm">{t("setroom.notif.decline")}</button>
              </form>
            </div>
          ))}
        </section>
      )}
      {items.length === 0 ? (
        <p className="p-6 text-muted">
          {filter === "events"
            ? t("setroom.notif.emptyEvents")
            : t("setroom.notif.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((n) => {
            const d = describe(n, t);
            return (
              <li key={n.id}>
                <Link href={d.href} className={`flex gap-3 px-4 py-3 hover:bg-surface ${n.read ? "" : "bg-brand/5"}`}>
                  {n.actor ? (
                    <span className="relative shrink-0">
                      <Avatar name={n.actor.tag} src={n.actor.avatarUrl} size="sm" />
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-background px-0.5 text-xs" aria-hidden="true">{d.icon}</span>
                    </span>
                  ) : (
                    <span className="w-8 shrink-0 text-center" aria-hidden="true">{d.icon}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm"><span className="min-w-0">{d.text}</span>{n.actor?.main && n.others === 0 && <MainBadge main={n.actor.main} />}</span>
                    {n.post && <span className="block truncate text-sm text-muted">{n.post.body}</span>}
                    <span className="block text-xs text-muted"><LocalTime iso={n.createdAt} style="dateTime" /></span>
                  </span>
                </Link>
                {n.type === "follow" && n.actor?.id && !followingBack.has(n.actor.id) && (
                  <div className="-mt-2 px-4 pb-3 pl-[3.75rem]">
                    <FollowButton profileId={n.actor.id} state="none" isProtected={!!n.actor.protected} signedIn />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </LangProvider>
  );
}

export default function NotificationsPage(props: PageProps<"/notifications">) {
  return (
    <section>
      <h1 className="px-4 pt-6 pb-3 text-2xl font-bold"><T k="setroom.notif.title" /></h1>
      <Suspense fallback={<FeedSkeleton count={6} label="Loading notifications…" />}>
        <Inbox searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
