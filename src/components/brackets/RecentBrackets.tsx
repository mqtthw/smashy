"use client";

// Brackets this browser opened recently, so following one again is one tap from the Brackets page.
// Kept only in this browser (localStorage), like other guest preferences; never sent to Smashy.
import Link from "next/link";
import { useEffect } from "react";
import { useStoredState } from "@/lib/useStoredState";
import { useT } from "@/lib/i18n/client";

const KEY = "smashy.recentBrackets";
const MAX = 5;

type Recent = { path: string; title: string; sub: string };

function parse(raw: string): Recent[] {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list)
      ? list.filter((r): r is Recent => typeof r?.path === "string" && r.path.startsWith("/") && typeof r.title === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

/** Put on a bracket page: remembers it (newest first, no repeats). Renders nothing. */
export function RememberBracket({ path, title, sub }: Recent) {
  const [, setRaw] = useStoredState(KEY, "[]");
  useEffect(() => {
    // Read storage itself: during the first render the hook still shows the server's empty list.
    let saved = "[]";
    try {
      saved = window.localStorage.getItem(KEY) ?? "[]";
    } catch {
      return; // storage blocked: nothing to remember
    }
    const list = parse(saved);
    if (list[0]?.path === path && list[0].title === title && list[0].sub === sub) return; // already first
    setRaw(JSON.stringify([{ path, title, sub }, ...list.filter((r) => r.path !== path)].slice(0, MAX)));
  }, [path, title, sub, setRaw]);
  return null;
}

/** "Your recent brackets" on the Brackets page (nothing until you've opened one). */
export function RecentBracketsList() {
  const [raw, setRaw] = useStoredState(KEY, "[]");
  const t = useT();
  const list = parse(raw);
  if (!list.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="recent-brackets">
      <div className="flex items-baseline justify-between">
        <h2 id="recent-brackets" className="font-bold">{t("browse.brackets.recent")}</h2>
        <button type="button" onClick={() => setRaw("[]")} className="text-meta text-muted hover:text-foreground">
          {t("browse.brackets.clear")}
        </button>
      </div>
      <ul className="card divide-y divide-line">
        {list.map((r) => (
          <li key={r.path}>
            <Link href={r.path} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.title}</span>
                {r.sub && <span className="block truncate text-meta text-muted">{r.sub}</span>}
              </span>
              <span className="shrink-0 text-meta font-semibold text-brand">{t("browse.openArrow")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
