// The top of the Feed's side panel (round 539): your picture, name, @handle and follow counts, like X.
// Guests get a sign-in button instead. Like X, the other accounts saved on this device sit as small pictures in
// the top-right corner: one tap switches (round 700); ⋯ opens Profile → Accounts to add or remove one.
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { avatarUrl } from "@/lib/avatarLinks";
import { getFollowCounts } from "@/lib/follows";
import { getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";
import { readSavedAccounts } from "@/lib/savedAccounts";
import { createClient, getUserId } from "@/lib/supabase/server";
import { switchAccount } from "@/app/profile/account-actions";

/** How many other accounts show as pictures (X shows two); the rest are under ⋯. */
const SHOWN = 2;

export default async function DrawerProfile() {
  const [userId, t] = await Promise.all([getUserId(), getT()]);
  if (!userId) {
    return <Link href={signInPath("/")} className="btn btn-md btn-primary w-full">{t("people.search.signIn")}</Link>;
  }
  const supabase = await createClient();
  const [{ data: me }, counts, saved] = await Promise.all([
    supabase.from("profiles").select("tag, handle, avatar_path").eq("id", userId).maybeSingle(),
    getFollowCounts(userId).catch(() => null),
    readSavedAccounts(),
  ]);
  if (!me) return null;
  const others = saved.filter((a) => a.id !== userId).slice(0, SHOWN);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/u/${me.handle}`} aria-label={me.tag}>
          <Avatar name={me.tag} src={avatarUrl(me.avatar_path)} size="lg" />
        </Link>
        <div className="flex items-center gap-2">
          {others.map((a) => (
            <form key={a.id} action={switchAccount}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="next" value="/" />
              <button className="block rounded-full" aria-label={t("people.accounts.switchTo", { handle: a.handle })} title={`@${a.handle}`}>
                <Avatar name={a.tag} src={avatarUrl(a.avatar)} className="h-9 w-9" />
              </button>
            </form>
          ))}
          <Link
            href="/profile#accounts"
            aria-label={t("people.accounts.switchLink")}
            title={t("people.accounts.switchLink")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-lg font-bold leading-none hover:bg-surface"
          >
            ⋯
          </Link>
        </div>
      </div>
      <Link href={`/u/${me.handle}`} className="flex flex-col">
        <span className="truncate text-lg font-bold">{me.tag}</span>
        <span className="truncate text-sm text-muted">@{me.handle}</span>
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
