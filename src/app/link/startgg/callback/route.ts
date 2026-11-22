// Step 2 of "Link start.gg": start.gg sends the user back here with a one-time code.
// We confirm who they are on start.gg, save the link, and discard start.gg's token.
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { copyStartggAvatar } from "@/lib/avatars";
import { getStartggProfileImage } from "@/lib/startgg";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { STARTGG_STATE_COOKIE, exchangeCode, fetchIdentity } from "@/lib/startggOAuth";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const fail = (reason: string) => NextResponse.redirect(`${origin}/profile?link_error=${reason}`);

  const userId = await getUserId();
  if (!userId) return NextResponse.redirect(`${origin}/signin`);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STARTGG_STATE_COOKIE)?.value;
  cookieStore.delete(STARTGG_STATE_COOKIE);

  if (searchParams.get("error")) return fail("cancelled");
  const code = searchParams.get("code");
  if (!code || !expectedState || searchParams.get("state") !== expectedState) return fail("expired");

  let identity;
  try {
    const accessToken = await exchangeCode(origin, code);
    identity = await fetchIdentity(accessToken);
  } catch (error) {
    console.error("start.gg link failed:", error);
    return fail("startgg");
  }

  // Server-only write: users can't create links themselves (see migration).
  const db = createAdminClient();
  const { error } = await db.from("startgg_links").upsert(
    {
      user_id: userId,
      startgg_user_id: identity.userId,
      startgg_player_id: identity.playerId,
      gamer_tag: identity.gamerTag,
      startgg_slug: identity.slug,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    // 23505 = unique violation: this start.gg player is already linked to another Smashy account.
    return fail(error.code === "23505" ? "taken" : "save");
  }

  // No Smashy picture yet? Start with their start.gg one (safety-checked; a picture they chose is kept).
  try {
    const { data: profile } = await db.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
    if (profile && !profile.avatar_path) {
      const url = await getStartggProfileImage(identity.userId);
      if (url) await copyStartggAvatar(userId, url);
    }
  } catch (e) {
    console.error("start.gg picture lookup failed", e instanceof Error ? e.message : e);
  }
  return NextResponse.redirect(`${origin}/profile?linked=1`);
}
