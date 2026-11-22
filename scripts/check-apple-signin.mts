// Checks a Sign in with Apple key with Apple itself, without printing anything secret.
// Usage (on the Mac, from the Smashy folder):
//   node scripts/check-apple-signin.mts ~/smashy-secrets/AuthKey_LJWJ84DK8G.p8 LJWJ84DK8G
// It asks Apple to trade a made-up one-time code. "invalid_grant" means Apple ACCEPTED the key and
// Key ID (only the made-up code was refused): the key is fine. "invalid_client" means Apple refused
// the key or the Key ID.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

// The same client secret as clientSecret() in src/lib/appleSignIn.ts (copied: Node can't load the
// app's files on their own).
function clientSecret(k: { teamId: string; keyId: string; privateKey: string; clientId: string }) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "ES256", kid: k.keyId })}.${b64({ iss: k.teamId, iat: now, exp: now + 3600, aud: "https://appleid.apple.com", sub: k.clientId })}`;
  return `${unsigned}.${createSign("SHA256").update(unsigned).sign({ key: k.privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
}

const [file, keyId] = process.argv.slice(2);
if (!file || !keyId) {
  console.log("Usage: node scripts/check-apple-signin.mts <path to AuthKey_XXXXXXXXXX.p8> <Key ID>");
  process.exit(1);
}
const key = { teamId: "FT82PDWLDB", keyId, privateKey: readFileSync(file, "utf8"), clientId: "gg.smashy.ios" };
const res = await fetch("https://appleid.apple.com/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: key.clientId, client_secret: clientSecret(key), code: "c.made-up-code-for-a-check", grant_type: "authorization_code" }),
});
const answer = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `status ${res.status}`;
console.log(answer === "invalid_grant" ? "OK: Apple accepts this key and Key ID." : `Apple refused it: ${answer}`);
