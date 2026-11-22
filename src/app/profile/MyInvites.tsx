"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { showToast } from "@/components/ui/Toaster";
import { makeMyInvite } from "./actions";
import InviteQR from "@/components/InviteQR";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";

type Code = { code: string; uses: number; maxUses: number; disabled: boolean; joined?: string[] };
const noop = () => () => {};

/** Private beta: your own invite codes (up to a few), with a copy-link button each. */
export default function MyInvites({ codes, max }: { codes: Code[]; max: number }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  // Copying can fail (Safari after a wait, no clipboard access): the code is on screen anyway.
  const copy = (code: string) =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(`${origin}/invite/${code}`))
      .then(() => showToast(t("people.invites.copied")))
      .catch(() => showToast(t("people.invites.copyFailed", { link: `${origin}/invite/${code}` })));
  return (
    <section aria-labelledby="my-invites" className="flex flex-col gap-2">
      <h2 id="my-invites" className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.invites.title")}</h2>
      <p className="text-sm text-muted">{t("people.invites.body", { n: max })}</p>
      <ul className="flex flex-col gap-1 text-sm">
        {codes.map((c) => (
          <li key={c.code} className="flex items-center gap-2">
            <span className="font-mono">{c.code}</span>
            <span className="text-muted">
              {c.disabled ? (
                t("people.invites.off")
              ) : c.joined?.length ? (
                (() => {
                  const [before, after = ""] = t("people.invites.usedBy", { who: "\u0001" }).split("\u0001");
                  return <>{before}<Link href={`/u/${c.joined[0]}`} className="hover:underline">@{c.joined[0]}</Link>{after}</>;
                })()
              ) : c.uses >= c.maxUses ? (
                t("people.invites.used")
              ) : (
                t("people.invites.notUsed")
              )}
            </span>
            {!c.disabled && c.uses < c.maxUses && (
              <>
                <button type="button" onClick={() => copy(c.code)} className="btn btn-sm btn-ghost">{t("people.invites.copyLink")}</button>
                <InviteQR code={c.code} />
              </>
            )}
          </li>
        ))}
      </ul>
      {codes.length < max && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await makeMyInvite();
              if (res.error) setError(res.error);
              else if (res.code) void copy(res.code);
            })
          }
          className="btn btn-sm btn-outline self-start"
        >
          {pending ? t("people.invites.making") : t("people.invites.make", { n: max - codes.length })}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
