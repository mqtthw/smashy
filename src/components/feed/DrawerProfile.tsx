// The top of the Feed's side panel (round 539): your picture, name, @handle and follow counts, like X.
// Guests get a sign-in button instead.
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { avatarUrl } from "@/lib/avatarLinks";
import { getFollowCounts } from "@/lib/follows";
import { getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";
import { createClient, getUserId } from "@/lib/supabase/server";

export default async function DrawerProfile() {
  const [userId, t] = await Promise.all([getUserId(), getT()]);
  if (!userId) {
    return <Link href={signInPath("/")} className="btn btn-md btn-primary w-full">{t("people.search.signIn")}</Link>;
  }
  const supabase = await createClient();
  const [{ data: me }, counts] = await Promise.all([
    supabase.from("profiles").select("tag, handle, avatar_path").eq("id", userId).maybeSingle(),
    getFollowCounts(userId).catch(() => null),
  ]);
  if (!me) return null;
  return (
    <div className="flex flex-col gap-2">
      <Link href={`/u/${me.handle}`} className="flex flex-col gap-2">
        <Avatar name={me.tag} src={avatarUrl(me.avatar_path)} size="lg" />
        <span className="flex flex-col">
          <span className="truncate text-lg font-bold">{me.tag}</span>
          <span className="truncate text-sm text-muted">@{me.handle}</span>
        </span>
      </Link>
      {counts && (
        <div className="flex gap-4 text-sm">
          <Link href={`/u/${me.handle}/following`} className="hover:underline"><b>{counts.following}</b> <span className="text-muted">{t("people.u.following")}</span></Link>
          <Link href={`/u/${me.handle}/followers`} className="hover:underline"><b>{counts.followers}</b> <span className="text-muted">{t("people.u.followers", { n: counts.followers })}</span></Link>
        </div>
      )}
    </div>
  );
}
