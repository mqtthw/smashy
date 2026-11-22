// Checking a device's push keys (shared by saving a device and sending to it; no server-only imports,
// so tests can use it).

/** A device's keys as push services expect them: a 65-byte public key (starting 0x04) and a 16-byte secret. */
export function validPushKeys(p256dh: string, auth: string): boolean {
  const bytes = (s: string) => {
    if (!/^[A-Za-z0-9_-]+={0,2}$/.test(s)) return null;
    try {
      return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    } catch {
      return null;
    }
  };
  const key = bytes(p256dh);
  const secret = bytes(auth);
  return !!key && key.length === 65 && key[0] === 4 && !!secret && secret.length === 16;
}

/**
 * A push address on one of the browsers' real push services (round 692, security review): Smashy's server
 * sends to whatever address is saved, so any other host would let someone make it call that host.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

export function validPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > 1000) return false;
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  return u.protocol === "https:" && !u.username && !u.password && (u.port === "" || u.port === "443") && PUSH_HOSTS.some((h) => h.test(u.hostname));
}
