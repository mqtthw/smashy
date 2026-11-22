"use client";

// Shown when an event, set or bracket page fails to load. A TO in the middle of a night needs to
// know two things the generic error page doesn't say: nothing recorded was lost, and what to do now.
import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

export default function HostErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT();
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  // Tell the error log (Admin > Health). Server errors are already recorded there; this catches browser ones.
  useEffect(() => {
    const message = error instanceof Error ? error.message : String(error);
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, digest, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error, digest]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-12">
      <h1 className="text-title font-bold">{t("hostsetup.error.title")}</h1>
      <p className="text-muted">
        {t("hostsetup.error.body")}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        <li>{t("hostsetup.error.tip1")}</li>
        <li>{t("hostsetup.error.tip2")}</li>
        <li>{t("hostsetup.error.tip3")}</li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-md btn-primary">
          {t("ui.error.retry")}
        </button>
        <Link href="/events" className="btn btn-md btn-outline">
          {t("hostsetup.error.allEvents")}
        </Link>
        <Link href="/host/guide" className="btn btn-md btn-ghost">
          {t("hostsetup.error.checklist")}
        </Link>
      </div>
      {digest && <p className="text-meta text-muted">{t("ui.error.code", { code: digest })}</p>}
    </div>
  );
}
