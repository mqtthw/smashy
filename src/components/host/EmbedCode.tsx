"use client";

// The host's "put the bracket on your website" box: the code to paste, a copy button and a preview.
import { Fragment, useState, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";

/** A phrase with {name} spots filled by React nodes (left unfilled by t(), then split here). */
function fill(text: string, nodes: Record<string, ReactNode>) {
  return text.split(/(\{\w+\})/).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return name && name in nodes ? <Fragment key={i}>{nodes[name]}</Fragment> : part;
  });
}

export default function EmbedCode({ code, previewHref }: { code: string; previewHref: string }) {
  const t = useT();
  const [copied, setCopied] = useState<boolean | null>(null);
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold">
        {t("hostbracket.embed.summary")}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-meta text-muted">
          {fill(t("hostbracket.embed.hint"), { dark: <code>?theme=dark</code>, light: <code>?theme=light</code>, embed: <code>/embed</code> })}
        </p>
        <textarea readOnly rows={4} value={code} aria-label={t("hostbracket.embed.codeLabel")} onFocus={(e) => e.currentTarget.select()} className="field font-mono text-meta" />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                setCopied(false);
              }
              setTimeout(() => setCopied(null), 2500);
            }}
          >
            {copied === true ? (
              <>
                <Icon name="check" /> {t("common.copied")}
              </>
            ) : copied === false ? (
              t("hostbracket.embed.couldntCopy")
            ) : (
              <>
                <Icon name="clipboard" /> {t("hostbracket.embed.copy")}
              </>
            )}
          </button>
          <a href={previewHref} target="_blank" rel="noopener" className="btn btn-sm btn-ghost">
            {t("hostbracket.embed.preview")}
          <NewTab /></a>
        </div>
      </div>
    </details>
  );
}
