"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_LANG, isLang, LANG_COOKIE, pickLang, type Lang, type MessageKey } from "@/lib/i18n/base";
import { loadLang, translateNow } from "@/lib/i18n/client";

// No providers or layout script here, so the language comes straight from the saved choice (the
// cookie), else the browser's languages. English on the server.
const noop = () => () => {};
function readLang(): Lang {
  const saved = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))?.[1];
  return isLang(saved) ? saved : pickLang(navigator.languages ?? navigator.language);
}

// Last-resort error screen if the whole app shell fails. It can't use the site's
// stylesheet, so it carries its own minimal styles and follows the device theme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const lang = useSyncExternalStore(noop, readLang, () => DEFAULT_LANG);
  // English until the visitor's language has been fetched, then again in theirs.
  const [, setReady] = useState(false);
  useEffect(() => void loadLang(lang).then(() => setReady(true)), [lang]);
  const t = (key: MessageKey) => translateNow(lang, key);
  // Tell the error log (Admin > Health): the worst failures used to be the only ones never recorded.
  useEffect(() => {
    const message = error instanceof Error ? error.message : String(error);
    const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `(whole app) ${message}`, digest, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);
  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          colorScheme: "light dark",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Smashy: something went wrong</title>
        <div>
          <h1 style={{ fontSize: 20 }}>{t("ui.error.title")}</h1>
          <p>{t("ui.error.appBody")}</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 12, padding: "8px 16px", borderRadius: 9999, border: 0, background: "#cf1b14", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            {t("ui.error.retry")}
          </button>
        </div>
      </body>
    </html>
  );
}
