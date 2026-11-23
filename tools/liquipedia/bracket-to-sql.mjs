// Turns brackets read from Liquipedia by hand (tools/liquipedia/read-bracket.js) into a migration that saves
// them as sets of old majors (major_sets), so a year's head-to-head counts them (Matthew, 2026-11-22).
//
//   node tools/liquipedia/bracket-to-sql.mjs <brackets.txt> > supabase/migrations/<number>_history_old_sets_<name>.sql
//
// The input file holds one or more brackets, each starting with the major and bracket it belongs to:
//   @manual/2013-zenith-2013 manual-melee-1 melee https://liquipedia.net/smash/Zenith/2013/Melee/Singles_Bracket
//   #Winners Round 1
//   Codi~1~Vist~2~2
// A set is "top~score~bottom~score~winner": a score of "W" (or none) is a win with no score; "1/1" against
// "3/3" is a grand final and its reset, saved as two sets. Sets whose winner can't be told are left out.
// Fullwidth ＆ ？ ＝ (the browser read swaps them in) become & ? = again.

import { readFileSync } from "node:fs";

const plain = (s) => s.replace(/＆/g, "&").replace(/？/g, "?").replace(/＝/g, "=").trim();
const num = (s) => (/^\d{1,3}$/.test(s ?? "") ? Number(s) : null);

/** The text → brackets: { slug, eventId, game, source, sets: [{ round, p1, p2, s1, s2, winner }] }. */
export function parseBrackets(text) {
  const brackets = [];
  let cur = null;
  let round = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("@")) {
      const [slug, eventId, game, source] = line.slice(1).split(/\s+/);
      cur = { slug, eventId, game, source: source ?? null, sets: [] };
      brackets.push(cur);
      round = "";
      continue;
    }
    if (!cur) throw new Error(`A set before any @major line: ${line}`);
    if (line.startsWith("#")) {
      round = plain(line.slice(1));
      continue;
    }
    const [a, sa = "", b, sb = "", w = "0"] = line.split("~");
    if (!a || !b) throw new Error(`Not a set: ${line}`);
    const p1 = plain(a);
    const p2 = plain(b);
    const s1 = sa.split("/");
    const s2 = sb.split("/");
    const sets = Math.max(s1.length, s2.length);
    for (let i = 0; i < sets; i++) {
      const x = num(s1[i]);
      const y = num(s2[i]);
      let winner = x !== null && y !== null && x !== y ? (x > y ? 1 : 2) : s1[i] === "W" ? 1 : s2[i] === "W" ? 2 : 0;
      // One score column: the bold name (the page's winner) decides when the scores don't.
      if (!winner && sets === 1) winner = Number(w) === 1 || Number(w) === 2 ? Number(w) : 0;
      if (!winner) continue;
      cur.sets.push({ round: i === 0 ? round : `${round} (reset)`, p1, p2, s1: x, s2: y, winner });
    }
  }
  return brackets;
}

const q = (s) => (s === null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

/** The brackets → SQL that saves their sets (safe to run twice: a set is replaced by its id). */
export function bracketsSql(brackets) {
  const parts = [];
  for (const b of brackets) {
    if (!b.sets.length) continue;
    const rows = b.sets.map(
      (s, i) =>
        `  (${q(`${b.slug}|${b.eventId}|${i + 1}`)}, ${q(b.slug)}, ${q(b.eventId)}, ${q(b.game)}, 'Bracket', ${q(s.round)}, ${(i + 1) * 10}, ${q(s.p1)}, ${s.s1 ?? "null"}, ${q(s.p2)}, ${s.s2 ?? "null"}, ${s.winner})`,
    );
    parts.push(
      `-- ${b.slug} (${b.game}): ${b.sets.length} sets${b.source ? `, from ${b.source}` : ""}\n` +
        "insert into public.major_sets (set_id, major_slug, event_id, game, phase, round, sort_order, p1_name, p1_score, p2_name, p2_score, winner)\nvalues\n" +
        rows.join(",\n") +
        "\non conflict (set_id) do update set round = excluded.round, sort_order = excluded.sort_order, p1_name = excluded.p1_name,\n" +
        "  p1_score = excluded.p1_score, p2_name = excluded.p2_name, p2_score = excluded.p2_score, winner = excluded.winner;",
    );
  }
  return parts.join("\n\n") + "\n";
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node tools/liquipedia/bracket-to-sql.mjs <brackets.txt>");
    process.exit(1);
  }
  process.stdout.write(bracketsSql(parseBrackets(readFileSync(file, "utf8"))));
}
