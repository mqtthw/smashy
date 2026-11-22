"use client";

// A small "Copy" button for a short piece of text (a connect code, a lobby code).
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard blocked; the code is visible to copy by hand
        }
      }}
      className="badge border border-line font-normal hover:bg-surface"
    >
      {copied ? t("ui.copied") : (label ?? t("common.copy"))}
    </button>
  );
}
