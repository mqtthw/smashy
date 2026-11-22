"use client";

// "Copy results": the top 8 as plain text, ready to paste into Discord or a group chat.
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export default function CopyResults({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState<boolean | null>(null);
  return (
    <button
      type="button"
      className="btn btn-md btn-outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
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
        t("hostbracket.couldntCopy")
      ) : (
        <>
          <Icon name="clipboard" /> {t("hostbracket.copyResults")}
        </>
      )}
    </button>
  );
}
