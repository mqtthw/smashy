import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";
import { getTournamentWinners, type EventWinners } from "@/lib/startgg";

/**
 * Who won a finished tournament's events ("🏆 Fox · Marth"), from start.gg's standings (the same
 * cached answer the tournament page uses), at most three names and each once; screen readers hear
 * "Won by …". Put it in a Suspense so it streams in after the list; nothing if start.gg can't say.
 */
export default async function RecentWinners({ slug }: { slug: string }) {
  const [byEvent, t] = await Promise.all([getTournamentWinners(slug).catch(() => ({}) as Record<string, EventWinners>), getT()]);
  const winners = Object.values(byEvent);
  if (!winners.length) return null;
  return (
    <span className="block truncate text-meta text-muted">
      <Icon name="trophy" label={t("browse.recent.wonBy")} /> {[...new Set(winners.map((w) => w.first))].slice(0, 3).join(" · ")}
    </span>
  );
}
