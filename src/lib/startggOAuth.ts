// "Link start.gg": OAuth helpers. Server-only (uses the client secret).
// Docs: https://developer.start.gg/docs/oauth/oauth-overview

export const STARTGG_STATE_COOKIE = "smashy_startgg_state";
const SCOPE = "user.identity"; // only "who are you"; we never post or act on their behalf

export function startggRedirectUri(origin: string) {
  return `${origin}/link/startgg/callback`;
}

export function startggAuthorizeUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STARTGG_CLIENT_ID ?? "",
    scope: SCOPE,
    redirect_uri: startggRedirectUri(origin),
    state,
  });
  return `https://start.gg/oauth/authorize?${params.toString().replace(/\+/g, "%20")}`;
}

/** Trade the one-time code for an access token (used once, then discarded). */
export async function exchangeCode(origin: string, code: string): Promise<string> {
  const res = await fetch("https://api.start.gg/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.STARTGG_CLIENT_ID,
      client_secret: process.env.STARTGG_CLIENT_SECRET,
      code,
      scope: SCOPE,
      redirect_uri: startggRedirectUri(origin),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(json.message ?? json.error ?? `start.gg token error (${res.status})`);
  return json.access_token as string;
}

export type StartggIdentity = { userId: number; playerId: number; gamerTag: string | null; slug: string | null };

/** Ask start.gg who this token belongs to. */
export async function fetchIdentity(accessToken: string): Promise<StartggIdentity> {
  const res = await fetch("https://api.start.gg/gql/alpha", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ query: "{ currentUser { id slug player { id gamerTag } } }" }),
  });
  const json = await res.json();
  const u = json.data?.currentUser;
  if (!u?.id || !u.player?.id) throw new Error("start.gg didn't return a player for this account");
  return { userId: Number(u.id), playerId: Number(u.player.id), gamerTag: u.player.gamerTag ?? null, slug: u.slug ?? null };
}
