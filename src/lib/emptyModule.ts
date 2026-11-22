// An empty stand-in for Node-only modules (fs, path) in browser builds. sql.js (used by
// lib/slippipediaRead.ts) mentions them in a code path that only runs on a server; the browser never
// reaches it, but the bundler still has to resolve the names. See turbopack.resolveAlias in next.config.ts.
const empty = {};
export default empty;
