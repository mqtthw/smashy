"use client";

// Copies a stream overlay's full address (what OBS / Streamlabs asks for in a browser source).
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export default function CopyOverlayLink({ path, label }: { path: string; label?: string }) {
  const t = useT();
  const [copied, setCopied] = useState<boolean | null>(null);
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline self-start"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
          setCopied(true);
        } catch {
          setCopied(false);
        }
        setTimeout(() => setCopied(null), 2500);
      }}
    >
      {copied === true ? (
        <>
          <Icon name="check" /> {t("hostbracket.overlay.copied")}
        </>
      ) : copied === false ? (
        t("hostbracket.overlay.couldntCopy")
      ) : (
        <>
          <Icon name="clipboard" /> {label ?? t("hostbracket.overlay.copy")}
        </>
      )}
    </button>
  );
}
