"use client";

import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

/** Opens the browser's print window (the page's own print styles hide everything but the poster). */
export default function PrintButton({ label }: { label?: string }) {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-md btn-primary">
      <Icon name="printer" /> {label ?? t("hostbracket.print")}
    </button>
  );
}
