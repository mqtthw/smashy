"use client";

// Shown when a page fails to load (for example, the database is unreachable),
// instead of quietly showing an empty page.
import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
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
    <div className="px-4 py-16 text-center">
      <h1 className="text-title font-bold">{t("ui.error.title")}</h1>
      <p className="mt-2 text-muted">{t("ui.error.body")}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-md btn-primary">
          {t("ui.error.retry")}
        </button>
        <Link href="/" className="btn btn-md btn-outline">
          {t("ui.error.home")}
        </Link>
      </div>
      {digest && <p className="mt-6 text-meta text-muted">{t("ui.error.code", { code: digest })}</p>}
    </div>
  );
}
