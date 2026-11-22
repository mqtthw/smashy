"use client";

import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/client";

const field = "field";

/**
 * Month / day / year pickers for a birthday (optional at sign-up; `optional` lets all three stay blank). Neutral: no default answer, no hint about the cutoff.
 * Controlled so choices survive a form error (React clears uncontrolled forms after each submit).
 */
export default function BirthdateFields({ currentYear, optional = false }: { currentYear: number; optional?: boolean }) {
  const t = useT();
  const lang = useLang();
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2000, i, 15)).toLocaleString(lang, { month: "long", timeZone: "UTC" }));
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");

  return (
    <div className="grid grid-cols-[2fr_1fr_1.3fr] gap-2">
      <select name="month" required={!optional} value={month} onChange={(e) => setMonth(e.target.value)} className={field} aria-label={t("signin.month")}>
        <option value="" disabled={!optional}>{t("signin.month")}</option>
        {months.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
      </select>
      <select name="day" required={!optional} value={day} onChange={(e) => setDay(e.target.value)} className={field} aria-label={t("signin.day")}>
        <option value="" disabled={!optional}>{t("signin.day")}</option>
        {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
      <select name="year" required={!optional} value={year} onChange={(e) => setYear(e.target.value)} className={field} aria-label={t("signin.year")}>
        <option value="" disabled={!optional}>{t("signin.year")}</option>
        {Array.from({ length: 100 }, (_, i) => currentYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
