import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getConversation, getMyBlockedIds } from "@/lib/messages";
import { getUserId } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { acceptRequest, blockUser, leaveConversation } from "../actions";
import ChatSettings from "./ChatSettings";
import ChatView from "./ChatView";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.messages"), robots: { index: false } };
}

async function Chat({ params }: { params: PageProps<"/messages/[id]">["params"] }) {
  const userId = await getUserId();
  const { id } = await params;
  if (!userId) redirect(signInPath(`/messages/${id}`));
  const [conv, blockedIds] = await Promise.all([getConversation(id, userId), getMyBlockedIds(userId)]);
  if (!conv) notFound();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  // conversationName, with its fallbacks in the visitor's language.
  const name = conv.kind === "group" ? (conv.title ?? t("play.msg.groupChat")) : (conv.members[0]?.tag ?? t("play.msg.deletedAccount"));
  const other = conv.kind === "direct" ? conv.members[0] : null;

  const cantSendReason = conv.canSend
    ? null
    : conv.myStatus === "request"
      ? t("play.msg.acceptToReply")
      : conv.waitingOnThem
        ? t("play.msg.requestSent")
        : conv.kind === "direct" && !other
          ? t("play.msg.accountGone")
          : t("play.msg.cantSend");

  return (
    <LangProvider lang={lang}>
    <div className="flex h-above-dock flex-col">
      <header className="relative flex items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/messages" className="text-muted hover:text-foreground" aria-label={t("play.msg.back")}>←</Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold">
            {other ? <Link href={`/u/${other.handle}`} className="hover:underline">{name}</Link> : name}
          </h1>
          <p className="truncate text-meta text-muted">
            {conv.kind === "group" ? conv.members.map((m) => m.tag).concat(t("play.msg.youName")).join(", ") : other ? `@${other.handle}` : ""}
          </p>
        </div>
        <ChatSettings conversationId={conv.id} isGroup={conv.kind === "group"} title={conv.title} members={conv.members} iAmOwner={conv.myRole === "owner"} muted={conv.myMuted} />
      </header>

      {conv.myStatus === "request" && (
        <div className="flex flex-col gap-2 border-b border-line bg-surface px-4 py-3 text-sm">
          <p>
            <b>{name}</b> {t("play.msg.wantsToMessage")}
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={acceptRequest.bind(null, conv.id)}>
              <button className="btn btn-sm btn-primary">{t("play.msg.accept")}</button>
            </form>
            <form action={leaveConversation.bind(null, conv.id)}>
              <button className="btn btn-sm btn-outline">{t("play.msg.delete")}</button>
            </form>
            {other && (
              <form action={async () => { "use server"; await blockUser(other.id, conv.id); }}>
                <button className="btn btn-sm btn-danger">{t("play.msg.block")}</button>
              </form>
            )}
          </div>
        </div>
      )}
      {conv.waitingOnThem && conv.myStatus === "active" && conv.canSend && (
        <p className="border-b border-line bg-surface px-4 py-2 text-meta text-muted">
          {t("play.msg.goesToRequests", { name })}
        </p>
      )}

      <ChatView
        conversationId={conv.id}
        viewerId={userId}
        initial={conv.messages}
        people={conv.members}
        isGroup={conv.kind === "group"}
        canSend={conv.canSend}
        cantSendReason={cantSendReason}
        waitingOnThem={conv.waitingOnThem}
        isRequest={conv.myStatus === "request"}
        blockedIds={conv.kind === "group" ? blockedIds : []}
        otherReadAt={conv.otherReadAt}
        hasOlder={conv.hasOlder}
        myLastReadAt={conv.myLastReadAt}
      />
    </div>
    </LangProvider>
  );
}

export default function ConversationPage(props: PageProps<"/messages/[id]">) {
  return (
    <Suspense fallback={<div className="p-4"><PageSkeleton /></div>}>
      <Chat params={props.params} />
    </Suspense>
  );
}
