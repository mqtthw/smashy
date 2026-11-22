// Other accounts saved on this device, at the bottom of the side menu on wider screens (round 701; phones have
// them in the Feed's side panel, round 700). One tap switches; ⋯ opens Profile → Accounts. Reads only the
// saved-accounts cookie (no database call), and shows nothing when no account is saved, so every page stays cheap.
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { avatarUrl } from "@/lib/avatarLinks";
import { getT } from "@/lib/i18n/server";
import { readSavedAccounts } from "@/lib/savedAccounts";
import { switchAccount } from "@/app/profile/account-actions";

const SHOWN = 3;

export default async function SideAccounts() {
  const list = await readSavedAccounts();
  if (!list.length) return null;
  const t = await getT();
  return (
    <div className="flex flex-col items-center gap-2 px-3 pb-2 lg:items-start lg:px-5">
      <span className="sr-only lg:not-sr-only text-meta font-semibold uppercase tracking-wide text-muted">{t("people.accounts.title")}</span>
      <div className="flex flex-col items-center gap-2 lg:flex-row lg:flex-wrap">
        {list.slice(0, SHOWN).map((a) => (
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
  );
}
