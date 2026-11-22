"use client";
// The language menu: a small globe and the current language, opening the list. Changes the menus
// straight away and reloads the page's own text.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Icon from "@/components/ui/Icon";
import { isLang, LANG_NAMES, LANGS } from "@/lib/i18n/base";
import { setLang, useLang, useT } from "@/lib/i18n/client";
import { saveLang } from "@/app/lang-actions";

/** `selectClassName` restyles the list itself (the narrow icon sidebar lays it over the globe). */
export default function LanguageSwitch({ className = "", selectClassName = "" }: { className?: string; selectClassName?: string }) {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={`flex items-center gap-1 text-meta text-muted ${className}`}>
      <Icon name="globe" />
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={lang}
        disabled={pending}
        onChange={(e) => {
          const l = e.target.value;
          if (!isLang(l) || l === lang) return;
          start(async () => {
            await setLang(l); // fetches that language's phrases first
            await saveLang(l).catch(() => {}); // alerts in this language too (signed-in members)
            router.refresh();
          });
        }}
        className={`max-w-28 cursor-pointer rounded-md bg-transparent py-0.5 pr-1 hover:text-foreground ${selectClassName}`}
      >
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>{LANG_NAMES[l]}</option>
        ))}
      </select>
    </label>
  );
}
