"use client";

// TO: where a called set is played ("3" → "Setup 3", or "Stream"). Saves on Enter or when the box
// loses focus; the players are told where to go. One-tap buttons offer the next free numbered
// setup and, while nobody is on it, the stream (the event's stream overlay follows that set).
import { useState, useTransition } from "react";
import { setStation } from "@/app/host/live-actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export default function StationInput({ setId, station, suggest, streamFree }: { setId: string; station: string | null; suggest?: string; streamFree?: boolean }) {
  const t = useT();
  const [value, setValue] = useState(station ?? "");
  const [saved, setSaved] = useState(station ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = (v = value) => {
    if (v.trim() === saved.trim()) return;
    start(async () => {
      const res = await setStation(setId, v);
      setError(res.error ?? null);
      if (!res.error) {
        setSaved(v);
        setValue(v);
      }
    });
  };
  return (
    <span className="flex shrink-0 flex-col items-end">
      <span className="flex items-center gap-1">
      {!saved && suggest && (
        <button type="button" className="btn btn-sm btn-ghost px-2 text-meta" disabled={pending} onClick={() => save(suggest)} aria-label={t("hostbracket.station.putOn", { setup: suggest })}>
          → {suggest}
        </button>
      )}
      {!saved && streamFree && (
        <button type="button" className="btn btn-sm btn-ghost px-2 text-meta" disabled={pending} onClick={() => save("Stream")} aria-label={t("hostbracket.station.putOnStream")}>
          → <Icon name="video" /> Stream
        </button>
      )}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
        maxLength={20}
        placeholder={t("hostbracket.station.placeholder")}
        aria-label={t("hostbracket.station.label")}
        disabled={pending}
        className="w-20 rounded-lg border border-line bg-field px-2 py-1 text-meta"
      />
      </span>
      {error && <span role="status" className="max-w-40 text-right text-meta text-danger">{error}</span>}
    </span>
  );
}
