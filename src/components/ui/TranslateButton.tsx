"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { translate, type TranslateSource } from "@/app/translate/actions";
import { looksForeign } from "@/lib/looksForeign";
import { useLang, useT } from "@/lib/i18n/client";
import SignInLink from "@/components/ui/SignInLink";

const noop = () => () => {};
const languageName = (code: string | null | undefined, reader: string) => {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([reader], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
};

/**
 * "Translate" under text that looks like it's in another language (guessed in the browser). Shows the
 * translation right under the original, with "Hide translation". `tone="dark"` for Reels.
 */
export default function TranslateButton({ text, source, tone = "light" }: { text: string; source: TranslateSource; tone?: "light" | "dark" }) {
  const t = useT();
  const lang = useLang();
  const reader = useSyncExternalStore(noop, () => navigator.language || "en", () => "en");
  const show = useSyncExternalStore(noop, () => looksForeign(text, navigator.language || "en"), () => false);
  const [result, setResult] = useState<{ text: string; from: string | null } | null>(null);
  const [showing, setShowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [same, setSame] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!show || same) return null;

  const link = tone === "dark" ? "text-white/70 hover:text-white" : "text-muted hover:text-foreground";
  const go = () => {
    if (result) return setShowing((s) => !s);
    startTransition(async () => {
      setError(null);
      const res = await translate(source, reader);
      if (res.same) setSame(true);
      else if (res.signIn) setNeedsSignIn(true);
      else if (res.error || !res.text) setError(res.error ?? t("ui.translateFailed"));
      else {
        setResult({ text: res.text, from: res.from ?? null });
        setShowing(true);
      }
    });
  };

  return (
    <div className="mt-1 text-sm">
      {showing && result && (
        <p className={`mb-1 whitespace-pre-wrap break-words ${tone === "dark" ? "text-white" : ""}`} lang={reader}>
          {result.text}
        </p>
      )}
      <button type="button" onClick={go} disabled={pending} className={`text-meta font-semibold ${link}`}>
        {pending
          ? t("ui.translating")
          : showing
            ? result?.from
              ? t("ui.translatedFrom", { lang: languageName(result.from, lang) ?? result.from })
              : t("ui.translated")
            : t("ui.translate")}
      </button>
      {error && <span className={`ml-2 text-meta ${tone === "dark" ? "text-white/60" : "text-muted"}`}>{error}</span>}
      {needsSignIn && (
        <SignInLink className={`ml-2 text-meta font-semibold underline ${tone === "dark" ? "text-white" : "text-brand"}`}>{t("ui.translateSignIn")}</SignInLink>
      )}
    </div>
  );
}
