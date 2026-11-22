import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Database rule tests (privacy, permissions, feed rules) against the real Supabase project.
// Run with `npm run test:db`. They use the keys in .env.local, make throwaway "TestDb…" accounts,
// and delete them afterwards. Without the keys (e.g. GitHub checks), they're skipped.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false, // one file at a time, to stay gentle on the database
  },
});
