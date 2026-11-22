"use client";

// "Starts in 2h 15m" under an upcoming event's time (kept current; hidden once it starts or when
// it's more than a week away, where the date says enough).
import { useEffect, useState } from "react";
import { english, type MessageKey, type Values } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";

type Tr = (key: MessageKey, values?: Values) => string;

export function startsInText(ms: number, within = 7 * 86_400_000, prefix?: string, t: Tr = english): string | null {
  if (ms <= 0 || ms > within) return null;
  const head = prefix ?? t("event.startsIn");
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `${head} ${t("event.duration.min", { n: mins })}`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${head} ${mins % 60 ? t("event.duration.hoursMins", { h, m: mins % 60 }) : t("event.duration.hours", { h })}`;
  const d = Math.floor(h / 24);
  return `${head} ${h % 24 ? t("event.duration.daysHours", { n: d, h: h % 24 }) : t("event.duration.days", { n: d })}`;
}

// Prefixes other parts pass in English, in the visitor's language.
const PREFIX: Record<string, MessageKey> = { in: "event.in" };

export default function StartsIn({ iso, within, prefix, className = "text-meta font-semibold text-brand" }: { iso: string; within?: number; prefix?: string; className?: string }) {
  const t = useT();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const text = startsInText(Date.parse(iso) - now, within, prefix && PREFIX[prefix] ? t(PREFIX[prefix]) : prefix, t);
  return text ? <span className={className}>{text}</span> : null;
}
