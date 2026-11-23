// Read one Liquipedia bracket page (the old-style brackets: .bracket / .bracket-game) into compact text.
// Run it in the browser on a page such as https://liquipedia.net/smash/Apex/2013/Melee/Singles_Bracket
// (Matthew, 2026-11-22: old majors' sets are read by hand, a page at a time, paced a few seconds apart).
// It keeps the text in window.__lp and returns the first part; read the rest with
// window.__lp.slice(1000, 2000) and so on. Output, one set per line, with "#Round" lines between rounds:
//   #Winners Round 1
//   Hungrybox~2~Yakal~0~1        (top player, their score(s), bottom player, score(s), winner 1/2/0)
// A score of "W" is a win with no score given; two scores ("2/4") are a grand final and its reset.
// Byes are left out. tools/liquipedia/bracket-to-sql.mjs turns the text into a migration.
(() => {
  const side = (p) => {
    if (!p) return null;
    const scores = [...p.querySelectorAll(".bracket-score")];
    const c = p.cloneNode(true);
    c.querySelectorAll(".bracket-score, .bracket-popup-wrapper").forEach((x) => x.remove());
    return {
      name: c.textContent.replace(/\s+/g, " ").trim(),
      scores: scores.map((s) => (s.querySelector(".fa-check") ? "W" : s.textContent.trim())),
      bold: Number(getComputedStyle(p).fontWeight) >= 600,
    };
  };
  const out = [];
  let last = "";
  // Nested .bracket wrappers repeat the same games: only brackets with their own columns are read.
  document.querySelectorAll(".bracket").forEach((b) => {
    b.querySelectorAll(":scope > .bracket-column").forEach((col) => {
      const hdr = col.querySelector(".bracket-header")?.textContent.trim() || "";
      col.querySelectorAll(".bracket-game").forEach((g) => {
        const t = side(g.querySelector(".bracket-player-top"));
        const o = side(g.querySelector(".bracket-player-bottom"));
        if (!t || !o || !t.name || !o.name || /^bye$/i.test(t.name) || /^bye$/i.test(o.name)) return;
        if (hdr !== last) out.push(`#${(last = hdr)}`);
        const w = t.bold && !o.bold ? 1 : o.bold && !t.bold ? 2 : 0;
        out.push([t.name, t.scores.join("/"), o.name, o.scores.join("/"), w].join("~"));
      });
    });
  });
  window.__lp = out.join("\n");
  return `${document.title.split(" - ")[0]} chars=${window.__lp.length}\n${window.__lp.slice(0, 1000)}`;
})();
