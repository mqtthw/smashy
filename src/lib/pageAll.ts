// Reads every row of a query, 1,000 at a time (the database hands back at most 1,000 rows per request).
// Server-only helpers use it for jobs that touch everyone (weekly digest, reminders).

const PAGE = 1000;

export async function pageAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, max = 100_000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}
