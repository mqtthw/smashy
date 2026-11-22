import InboxTime from "@/components/messages/InboxTime";
import { unixNow } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import InboxLive from "@/components/messages/InboxLive";
import Avatar from "@/components/ui/Avatar";
import { conversationName, getInbox, type InboxEntry } from "@/lib/messages";
import { getUserId } from "@/lib/supabase/server";
import { hasBirthday } from "@/lib/viewer";
import AddBirthday from "@/components/AddBirthday";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import Icon from "@/components/ui/Icon";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";

type TFn = (key: MessageKey, values?: Values) => string;

/** conversationName, with its fallbacks ("Group chat", "Deleted account") in the visitor's language. */
function chatName(c: InboxEntry, t: TFn) {
  if (c.kind === "group") return c.title ?? t("play.msg.groupChat");
  return c.members[0]?.tag ?? t("play.msg.deletedAccount");
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.messages"), robots: { index: false } };
}



function preview(c: InboxEntry, t: TFn) {
  if (!c.lastBody && !c.lastHasImage && !c.lastDeleted) return t("play.msg.noMessages");
  const body = c.lastDeleted ? t("play.msg.unsent") : c.lastBody || t("play.msg.photo");
  const text = c.lastHasImage && c.lastBody ? t("play.msg.photoWith", { text: body }) : body;
  return c.lastFromMe ? t("play.msg.you", { text }) : text;
}

function Row({ c, t }: { c: InboxEntry; t: TFn }) {
  const name = chatName(c, t);
  return (
    <li>
      <Link href={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
        {c.kind === "direct" ? (
          <Avatar name={name} src={c.members[0]?.avatarUrl} className="h-11 w-11" />
        ) : (
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-lg font-bold text-brand"><Icon name="users" /></span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{name}</span>
            {c.kind === "group" && <span className="shrink-0 text-meta text-muted">{t("play.msg.people", { n: c.members.length + 1 })}</span>}
            {c.muted && <span className="shrink-0 text-meta text-muted" title={t("play.msg.muted")}><Icon name="bellOff" label={t("play.msg.muted")} /></span>}
            <span className="ml-auto shrink-0 text-meta text-muted"><InboxTime iso={c.lastMessageAt} serverNow={unixNow()} /></span>
          </span>
          <span className={`block truncate text-sm ${c.unread ? "font-semibold text-foreground" : "text-muted"}`}>{preview(c, t)}</span>
        </span>
        {c.unread > 0 && (
          <span className={`flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-5 ${c.muted ? "bg-surface-2 text-muted" : "bg-brand text-on-brand"}`} aria-label={t("play.msg.unread", { n: c.unread })}>
            {c.unread > 99 ? "99+" : c.unread}
          </span>
        )}
      </Link>
    </li>
  );
}

async function Inbox({ tab, q }: { tab: "chats" | "requests"; q: string }) {
  const userId = await getUserId();
  if (!userId) redirect(signInPath("/messages"));
  const [t, lang, birthday] = await Promise.all([getT(), getLang(), hasBirthday(userId)]);
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const all = (await getInbox(userId)).filter(
    (c) => !needle || conversationName(c).toLowerCase().includes(needle) || c.members.some((m) => m.handle.includes(needle) || m.tag.toLowerCase().includes(needle)),
  );
  const chats = all.filter((c) => c.status === "active");
  const requests = all.filter((c) => c.status === "request");
  const list = tab === "requests" ? requests : chats;
  return (
    <LangProvider lang={lang}>
      <InboxLive />
      {/* Messages need a birthday on file (round 692): say so up front, with the form (round 696). */}
      {!birthday && (
        <div className="px-4 pb-3">
          <AddBirthday currentYear={new Date().getFullYear()} next="/messages" title={t("people.birthday.toMessageTitle")} body={t("people.birthday.toMessageBody")} />
        </div>
      )}
      <form role="search" className="px-4 pb-2">
        {tab === "requests" && <input type="hidden" name="tab" value="requests" />}
        <label htmlFor="inbox-q" className="sr-only">{t("play.msg.search")}</label>
        <input id="inbox-q" name="q" defaultValue={q} placeholder={t("play.msg.search")} className="field w-full" autoComplete="off" />
      </form>
      <nav aria-label={t("play.msg.inbox")} className="flex border-b border-line">
        {(["chats", "requests"] as const).map((k) => (
          <Link
            key={k}
            href={k === "chats" ? "/messages" : "/messages?tab=requests"}
            aria-current={tab === k ? "page" : undefined}
            className={`flex-1 py-3 text-center text-sm ${tab === k ? "border-b-2 border-brand font-bold" : "text-muted"}`}
          >
            {k === "chats" ? t("play.msg.chats") : requests.length ? t("play.msg.requestsCount", { n: requests.length }) : t("play.msg.requests")}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted">
          {tab === "requests"
            ? needle ? t("play.msg.noRequestsMatch") : t("play.msg.noRequests")
            : needle ? t("play.msg.noChatsMatch") : t("play.msg.noChats")}
        </p>
      ) : (
        <ul className="divide-y divide-line">{list.map((c) => <Row key={c.id} c={c} t={t} />)}</ul>
      )}
    </LangProvider>
  );
}

export default async function MessagesPage(props: PageProps<"/messages">) {
  return (
    <section className="flex flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <h1 className="text-2xl font-bold"><T k="play.msg.title" /></h1>
        <Link href="/messages/new" className="btn btn-md btn-primary"><T k="play.msg.new" /></Link>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <InboxWithTab searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function InboxWithTab({ searchParams }: { searchParams: PageProps<"/messages">["searchParams"] }) {
  const { tab, q } = await searchParams;
  return <Inbox tab={tab === "requests" ? "requests" : "chats"} q={typeof q === "string" ? q.slice(0, 40) : ""} />;
}
