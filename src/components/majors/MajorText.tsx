"use client";
// A major's dates and place in the visitor's language (these cards are built ahead of time, so the
// language is filled in on the visitor's side, like <T>).
import { useLang } from "@/lib/i18n/client";
import { majorDates, majorPlace } from "@/lib/majorText";

export function MajorDates({ m }: { m: { startAt: string; endAt: string; timezone?: string | null } }) {
  return <>{majorDates(m, useLang())}</>;
}

/** The place, or `fallback` when there is none. */
export function MajorPlace({ m, fallback = null }: { m: { city: string | null; country: string | null }; fallback?: React.ReactNode }) {
  return <>{majorPlace(m, useLang()) ?? fallback}</>;
}
