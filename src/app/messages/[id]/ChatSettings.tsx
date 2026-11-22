"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { addGroupMembers, blockUser, leaveConversation, removeGroupMember, renameGroup, searchPeople, setChatMuted } from "../actions";

type Member = { id: string; tag: string; handle: string; role: "owner" | "member" };

/** Chat details: people, and for groups rename / add / remove / leave. Block lives here too. */
export default function ChatSettings({
  conversationId,
  isGroup,
  title,
  members,
  iAmOwner,
  muted = false,
}: {
  conversationId: string;
  isGroup: boolean;
  title: string | null;
  members: Member[];
  iAmOwner: boolean;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const [name, setName] = useState(title ?? "");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; tag: string; handle: string; mutual: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isGroup || !open) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const people = await searchPeople(q.trim().length >= 2 ? q : "");
      if (!stale) setFound(people.filter((p) => p.mutual && !members.some((m) => m.id === p.id)));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q, open, isGroup, members]);

  const run = (fn: () => Promise<{ error?: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
    });

  const other = !isGroup ? members[0] : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn btn-sm btn-ghost" aria-label={t("play.msg.details")}>
        ⓘ
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 flex max-h-[70dvh] flex-col gap-4 overflow-y-auto border-b border-line bg-background p-4 shadow-lg">
          {isGroup && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => renameGroup(conversationId, name));
              }}
              className="flex gap-2"
            >
              <label htmlFor="group-name" className="sr-only">{t("play.msg.groupName")}</label>
              <input id="group-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className="field flex-1" />
              <button disabled={pending || !name.trim() || name === title} className="btn btn-sm btn-outline">{t("play.msg.rename")}</button>
            </form>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-meta font-semibold uppercase tracking-wide text-muted">{isGroup ? t("play.msg.peopleCount", { n: members.length + 1 }) : t("play.msg.chatWith")}</h2>
            <ul className="flex flex-col gap-1">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <Link href={`/u/${m.handle}`} className="min-w-0 flex-1 truncate hover:underline">
                    <b>{m.tag}</b> <span className="text-muted">@{m.handle}{m.role === "owner" ? t("play.msg.createdGroup") : ""}</span>
                  </Link>
                  {isGroup && iAmOwner && (
                    <button type="button" disabled={pending} onClick={() => run(() => removeGroupMember(conversationId, m.id))} className="text-meta text-muted hover:text-danger">
                      {t("play.msg.removeMember")}
                    </button>
                  )}
                </li>
              ))}
              {isGroup && <li className="text-sm text-muted">{t("play.msg.youName")}{iAmOwner ? t("play.msg.createdGroup") : ""}</li>}
            </ul>
          </section>

          {isGroup && members.length < 19 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("play.msg.addPeople")}</h2>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("play.msg.searchShort")} className="field" />
              <ul className="flex flex-col gap-1">
                {found.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate"><b>{p.tag}</b> <span className="text-muted">@{p.handle}</span></span>
                    <button type="button" disabled={pending} onClick={() => run(() => addGroupMembers(conversationId, [p.id]))} className="btn btn-sm btn-outline">
                      {t("play.msg.add")}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <button type="button" disabled={pending} onClick={() => run(() => setChatMuted(conversationId, !muted))} className="btn btn-sm btn-outline">
              {muted ? t("play.msg.unmuteChat") : t("play.msg.muteChat")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => window.confirm(isGroup ? t("play.msg.leaveConfirm") : t("play.msg.deleteConfirm")) && run(() => leaveConversation(conversationId))}
              className="btn btn-sm btn-outline"
            >
              {isGroup ? t("play.msg.leaveGroup") : t("play.msg.deleteChat")}
            </button>
            {other && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  window.confirm(t("play.msg.blockConfirm", { name: other.tag })) &&
                  run(() => blockUser(other.id, conversationId))
                }
                className="btn btn-sm btn-danger"
              >
                {t("play.msg.blockName", { name: other.tag })}
              </button>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </>
  );
}
