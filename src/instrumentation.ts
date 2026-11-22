// Records server errors (pages, actions, routes) in Smashy's built-in error log (Admin > Health).
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  // Redirects and "not found" are how Next.js navigates, not errors.
  if (digest?.startsWith("NEXT_REDIRECT") || digest?.startsWith("NEXT_HTTP_ERROR_FALLBACK")) return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("./lib/errorLog");
  await logError("server", `${message} (${context.routeType} ${context.routePath})`, request.path, digest);
};
