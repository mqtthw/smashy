// Page check: visits every kind of page on a running Smashy (as a signed-out guest) and reports
// anything broken. Run the app first (npm run dev, or npm run build && npm start), then:
//
//   npm run check:pages                      # checks http://localhost:3000
//   npm run check:pages -- https://staging…  # checks another copy
//   npm run check:pages -- --extra /post/<id> /h/<id>   # also visit these addresses
//   npm run check:pages -- --lang es           # as a visitor who chose Spanish (or ja, fr)
//   npm run check:pages -- --lang es --english # …and list sentences still in English. Read them:
//     pages built ahead of time (About, the demo, the TO guide…) switch language in the browser,
//     so their raw HTML is English here; community content (guides, rulesets) and the Privacy and
//     Terms drafts are English on purpose. Open a flagged page in a browser to judge.
//   (In Git Bash, which rewrites arguments starting with "/", run it from PowerShell instead.)
//
// How it finds pages: every page in src/app is a "route" (e.g. /u/[handle]). It starts from the
// routes without [brackets] and follows links on each page to find real examples of the others
// (up to 2 per route). Routes it never finds a link to are listed at the end, not failed.
//
// What counts as broken: a server error (500), the "Something went wrong" screen, a link that leads
// to "Page not found", or a page without a main heading. Slow pages (over 3 s) are warnings.
// Signed-in-only pages are expected to send guests to /signin.
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const extraAt = args.indexOf("--extra");
const extra = extraAt >= 0 ? args.slice(extraAt + 1) : [];
const langAt = args.indexOf("--lang");
const lang = langAt >= 0 ? args[langAt + 1] : null;
const pageHeaders = lang ? { Cookie: `lang=${lang}` } : {};
const checkEnglish = args.includes("--english");
const base = (args.find((a, i) => !a.startsWith("--") && (extraAt < 0 || i < extraAt) && (langAt < 0 || i !== langAt + 1)) ?? process.env.SMASHY_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PER_ROUTE = 2;
const MAX_PAGES = 150;
const CONCURRENCY = 4;
const SLOW_MS = 3000;
// Pages whose link previews matter: they must have an og:image tag that returns a PNG.
const PREVIEW_ROUTES = new Set(["/", "/post/[id]", "/u/[handle]", "/sets/[source]/[id]", "/reels/[clipId]"]);
// Pages that only make sense signed in: guests get sent to /signin, or the page itself asks them to sign in.
const SIGNED_IN_ONLY = /^\/(profile|notifications|my-sets|welcome|highlights\/new|scenes\/request|reels\/share|messages|saved)(\/|$)|\/edit$|\/rulesets\/new$/;
// Admin pages pretend not to exist for everyone but site admins.
const ADMIN_ONLY = /^\/admin(\/|$)/;

// ---------- Routes from src/app ----------
function findRoutes(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findRoutes(full, out);
    else if (name === "page.tsx") {
      const route = "/" + relative("src/app", dir).split(sep).filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
      out.push(route === "/" ? "/" : route.replace(/\/$/, ""));
    }
  }
  return out;
}
const routes = findRoutes("src/app").sort();
const matchers = routes.map((r) => ({
  route: r,
  re: new RegExp("^" + r.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+") + "/?$"),
  // static routes win over dynamic ones (/rulesets/compare vs /rulesets/[id])
  dynamic: (r.match(/\[/g) ?? []).length,
}));
matchers.sort((a, b) => a.dynamic - b.dynamic);
const routeOf = (path) => matchers.find((m) => m.re.test(path))?.route ?? null;

// ---------- Crawl ----------
const visits = new Map(); // route -> count
const seen = new Set();
const queue = [];
const results = [];

function enqueue(path, from) {
  const route = routeOf(path);
  if (!route || seen.has(path)) return;
  if ((visits.get(route) ?? 0) >= PER_ROUTE) return;
  visits.set(route, (visits.get(route) ?? 0) + 1);
  seen.add(path);
  queue.push({ path, route, from });
}

for (const r of routes) if (!r.includes("[")) enqueue(r, "start");
for (const p of extra) enqueue(p, "--extra");

const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");

// With --lang (not English): sentences still in English. A run of Latin-letter words that uses at
// least three different English small words ("the", "your", "with"…) is very unlikely to be a name
// or a tournament title. Reported as warnings, with the sentence, so a person can judge.
const ENGLISH = new Set(["the", "and", "your", "you", "with", "this", "that", "from", "are", "is", "of", "to", "it", "be", "can", "will", "have", "has", "what", "when", "here", "there", "they", "their", "isn't", "don't", "you're", "it's"]);
function englishBits(html) {
  const plain = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, "\n").replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&");
  const found = [];
  for (const run of plain.split(/[\n.!?:·|]+/)) {
    const words = run.toLowerCase().match(/[a-z']+/g) ?? [];
    const small = new Set(words.filter((w) => ENGLISH.has(w)));
    if (small.size >= 3 && words.length >= 5) found.push(run.replace(/\s+/g, " ").trim().slice(0, 90));
  }
  return [...new Set(found)];
}

async function check({ path, route, from }) {
  const started = Date.now();
  const r = { path, route, from, problems: [], warnings: [], ms: 0, status: 0 };
  try {
    const res = await fetch(base + path, { redirect: "manual", headers: pageHeaders, signal: AbortSignal.timeout(60000) });
    r.status = res.status;
    const location = res.headers.get("location") ?? "";
    const html = res.status >= 300 && res.status < 400 ? "" : await res.text();
    r.ms = Date.now() - started;
    const streamedRedirect = html.match(/id="__next-page-redirect"[^>]*url=([^"]+)"/)?.[1] ?? "";
    const goesTo = location || streamedRedirect;
    // "Page not found" can arrive after the page has started (status stays 200), marked in the page data.
    const notFound = res.status === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404");

    if (ADMIN_ONLY.test(path)) {
      if (!notFound) r.problems.push("admin page is visible to a guest");
      r.note = "hidden from guests";
      return r;
    }
    if (SIGNED_IN_ONLY.test(path)) {
      // Content inside a loading boundary arrives after <main> (in a hidden block), so look at the whole page.
      // (The nav doesn't link to /signin, so a link means the page itself asks.)
      if (!/\/signin/.test(goesTo) && !/href="\/signin/.test(html)) r.problems.push("signed-in-only page didn't ask a guest to sign in");
      r.note = goesTo ? "sends guests to sign in" : "asks guests to sign in";
      return r;
    }
    if (goesTo) {
      r.note = `redirects to ${goesTo}`;
      return r;
    }
    if (res.status >= 500) r.problems.push(`server error ${res.status}`);
    // A linked file, not a page (a calendar feed, a results file, a picture): it only has to load.
    const type = res.headers.get("content-type") ?? "";
    if (res.status < 400 && !type.includes("text/html")) {
      r.note = `a file (${type.split(";")[0]})`;
      return r;
    }
    const body = text(html);
    if (/Something went wrong/.test(body)) r.problems.push('shows "Something went wrong"');
    if (notFound || /Page not found/.test(body)) {
      if (from !== "start" && from !== "--extra") r.problems.push(`broken link (Page not found), linked from ${from}`);
      else r.problems.push("Page not found");
    }
    if (!/<h1[\s>]/.test(html)) r.problems.push("no main heading (h1)");
    if (!/<title>[^<]+<\/title>/.test(html)) r.problems.push("no page title");
    if (r.ms > SLOW_MS) r.warnings.push(`slow: ${(r.ms / 1000).toFixed(1)} s`);
    if (checkEnglish && lang && lang !== "en") for (const bit of englishBits(html).slice(0, 3)) r.warnings.push(`English: "${bit}"`);

    if (PREVIEW_ROUTES.has(route) && r.problems.length === 0) {
      const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
      if (!og) r.problems.push("no link-preview image (og:image)");
      else {
        const img = await fetch(new URL(new URL(og).pathname + new URL(og).search, base), { signal: AbortSignal.timeout(60000) });
        if (img.headers.get("content-type") !== "image/png") r.problems.push(`link-preview image failed (${img.status})`);
      }
    }

    // Follow links to find examples of the other routes.
    for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
      const href = m[1].replace(/&amp;/g, "&").split("?")[0];
      if (results.length + queue.length < MAX_PAGES) enqueue(decodeURI(href), path);
    }
  } catch (e) {
    r.ms = Date.now() - started;
    r.problems.push(`couldn't load: ${e.cause?.code ?? e.message}`);
  }
  return r;
}

try {
  await fetch(base, { signal: AbortSignal.timeout(30000) });
} catch {
  console.error(`Can't reach ${base}. Start the app first (npm run dev), or pass its address.`);
  process.exit(2);
}

console.log(`Checking ${base} (${routes.length} routes)…\n`);
async function worker() {
  while (queue.length) {
    const job = queue.shift();
    const r = await check(job);
    results.push(r);
    const mark = r.problems.length ? "✗" : r.warnings.length ? "!" : "✓";
    const extraInfo = [...r.problems, ...r.warnings, r.note].filter(Boolean).join("; ");
    console.log(`${mark} ${String(r.status).padEnd(3)} ${String(r.ms).padStart(5)} ms  ${r.path}${extraInfo ? `  — ${extraInfo}` : ""}`);
  }
}
// Workers stop when the queue is momentarily empty, so loop until nothing new was found.
while (queue.length) await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const failed = results.filter((r) => r.problems.length);
const slow = results.filter((r) => r.warnings.some((w) => w.startsWith("slow")));
const english = results.filter((r) => r.warnings.some((w) => w.startsWith("English")));
const unreached = routes.filter((r) => !visits.has(r));
console.log(`\n${results.length} pages checked: ${results.length - failed.length} OK, ${failed.length} broken, ${slow.length} slow.${checkEnglish ? ` English text on ${english.length} (read them: see the note at the top).` : ""}`);
if (unreached.length) {
  console.log(`\nNo link found to these kinds of page (nothing to click yet, e.g. no posts), so they weren't checked:`);
  for (const r of unreached) console.log(`  ${r}`);
  console.log(`Check them by adding real addresses: npm run check:pages -- --extra /post/<id>`);
}
process.exit(failed.length ? 1 : 0);
