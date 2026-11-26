// Ranking for "Top clips" (getTopClips in reels.ts). Plain logic, no database.

/** The order for getTopClips (pure, so it can be tested): newer and more watched first, two per channel at most. */
export function rankTopClips<T extends { platform: string; channel_login: string; view_count: number; like_count?: number; created_at: string; submitted_at?: string | null }>(rows: T[], now: number, limit: number): T[] {
  const median = new Map<string, number>();
  for (const p of new Set(rows.map((r) => r.platform))) {
    const views = rows.filter((r) => r.platform === p).map((r) => r.view_count).sort((a, b) => a - b);
    median.set(p, Math.max(views[Math.floor(views.length / 2)] ?? 1, 1));
  }
  const score = (r: T) => {
    const ageDays = Math.max(0, now - Date.parse(r.submitted_at ?? r.created_at)) / 86400e3;
    return (Math.sqrt(r.view_count / median.get(r.platform)!) + (r.like_count ?? 0) * 0.5 + 0.2) / Math.pow(ageDays + 1, 1.2);
  };
  const perChannel = new Map<string, number>();
  const out: T[] = [];
  for (const r of [...rows].sort((a, b) => score(b) - score(a))) {
    const n = perChannel.get(r.channel_login) ?? 0;
    if (n >= 2) continue;
    perChannel.set(r.channel_login, n + 1);
    out.push(r);
    if (out.length === limit) break;
  }
  return out;
}
