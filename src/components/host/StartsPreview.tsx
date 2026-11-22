"use client";

// Under the host form's start time: "Starts in 3 days 4h", or a warning when it's too soon
// (events must start at least 10 minutes from now).
import { useEffect, useState } from "react";
import { startsInText } from "./StartsIn";
import { useT } from "@/lib/i18n/client";

export default function StartsPreview({ iso }: { iso: string }) {
  const t = useT();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  if (!iso || now === null) return null;
  const ms = Date.parse(iso) - now;
  if (ms < 10 * 60_000) {
    return (
      <span role="alert" className="text-meta font-semibold text-danger">
        {t(ms <= 0 ? "hostsetup.form.timePassed" : "hostsetup.form.tooSoon")} {t("hostsetup.form.tenMinutes")}
      </span>
    );
  }
  const text = startsInText(ms, 366 * 86_400_000, undefined, t);
  return text ? <span className="text-meta font-semibold text-brand">{text}</span> : null;
}
