import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Database rule tests (privacy, permissions, feed rules). Run with `npm run test:db`. They use the
// test project in .env.test.local when it exists (docs/test-database.md), else the keys in .env.local, make throwaway "TestDb…" accounts,
// and delete them afterwards. Without the keys (e.g. GitHub checks), they're skipped.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
    // The test database's keys (when .env.test.local exists) go in place before each file (round 814).
    setupFiles: ["tests/db/setupEnv.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false, // one file at a time, to stay gentle on the database
  },
});
