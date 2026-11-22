// Weekly digest: every Monday, a notification like "This week: 3 Smash events in San Antonio" (or in
// the person's region, e.g. "in Ontario", when nothing is listed in their city).
// Sent by the scheduled job (it runs daily; this only does anything on Mondays, once a week per person).
import { trFor } from "./i18n/recipients";
import { isLang } from "./i18n/core";
import "server-only";
import { getRegionEvents } from "./events";
import { HOME_REGION, isRegion, regionName } from "./regions";
import { createAdminClient } from "./supabase/admin";
import { displayCity, sameCity } from "./cityMatch";
import { pageAll } from "./pageAll";

/** `onlyUserIds` limits it to some accounts (used by tests). */
export async function sendWeeklyDigests(now = new Date(), onlyUserIds?: string[]): Promise<number | string> {
  if (now.getUTCDay() !== 1) return "not Monday";
  const start = now.getTime() / 1000;
  // This week's events per region (loaded once per region that someone is in).
  const weeks = new Map<string, { city: string | null; startAt: number }[]>();
  const weekIn = async (region: string) => {
    if (!weeks.has(region)) {
      const data = await getRegionEvents(region).catch(() => ({ tournaments: [], expected: [] }));
      weeks.set(region, [
        ...data.tournaments.map((t) => ({ city: t.city, startAt: t.startAt })),
        ...data.expected.map((w) => ({ city: w.city, startAt: w.startAt })),
      ].filter((e) => e.startAt > start && e.startAt < start + 7 * 86400));
    }
    return weeks.get(region)!;
  };

  const db = createAdminClient();
  const sixDaysAgo = new Date(now.getTime() - 6 * 86400e3).toISOString();
  // Everyone (page by page: the database returns at most 1,000 rows per request).
  const [people, already] = await Promise.all([
    pageAll<{ id: string; home_city: string | null; notification_mutes: string[] | null; region: string | null; lang: string | null }>((a, b) => {
      let q = db.from("profiles").select("id, home_city, notification_mutes, region, lang").order("id").range(a, b);
      if (onlyUserIds) q = q.in("id", onlyUserIds);
      return q;
    }),
    pageAll<{ user_id: string }>((a, b) => db.from("notifications").select("user_id").eq("type", "weekly_digest").gt("created_at", sixDaysAgo).order("id").range(a, b)),
  ]);
  const done = new Set((already ?? []).map((n) => n.user_id as string));
  const rows = [];
  for (const p of people) {
    if (done.has(p.id) || ((p.notification_mutes as string[] | null) ?? []).includes("weekly_digest")) continue;
    const region = isRegion(p.region) ? p.region : HOME_REGION;
    const week = await weekIn(region);
    if (!week.length) continue; // nothing on in their region this week: no digest
    const home = (p.home_city as string | null)?.trim();
    const local = home ? week.filter((e) => sameCity(home, e.city)).length : 0;
    const cityName = displayCity(home); // "satx" -> "San Antonio"
    const t = trFor(isLang(p.lang) ? p.lang : "en"); // in their language
    const text = local ? t("alert.digest.city", { n: local, place: cityName }) : t("alert.digest.city", { n: week.length, place: regionName(region) });
    rows.push({ user_id: p.id, actor_id: null, type: "weekly_digest", event_name: text, event_href: "/events", created_at: now.toISOString() });
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("notifications").insert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  return rows.length;
}
