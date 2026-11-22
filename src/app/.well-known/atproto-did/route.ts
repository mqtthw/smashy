// Tells Bluesky that the account with this ID may use the handle @smashy.gg (round 650, Matthew's
// Smashy account). Bluesky reads this file when the handle is set or checked. The ID is public, not a
// secret: anyone can look it up from the handle. To move the handle to another account, put that
// account's ID here (Bluesky → Settings → Account → Handle → I have my own domain → No DNS Panel).
const BLUESKY_DID = "did:plc:agkqbw5yaqr3k2iyyta3s3qo";

export function GET() {
  return new Response(BLUESKY_DID, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
