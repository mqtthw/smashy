// Accounts saved on this device (round 699): "Switch" to one in a tap, forget it, or add another. On the
// profile page under "Accounts", and on the sign-in page as "Continue as …".
import Avatar from "@/components/ui/Avatar";
import { avatarUrl } from "@/lib/avatarLinks";
import { getT } from "@/lib/i18n/server";
import { readSavedAccounts } from "@/lib/savedAccounts";
import { MAX_SAVED_ACCOUNTS } from "@/lib/savedAccountsCodec";
import { addAccount, forgetSavedAccount, switchAccount } from "@/app/profile/account-actions";

export default async function SavedAccounts({ mode, next = "/" }: { mode: "profile" | "signin"; next?: string }) {
  const [t, list] = await Promise.all([getT(), readSavedAccounts()]);
  if (mode === "signin" && !list.length) return null;
  const full = list.length >= MAX_SAVED_ACCOUNTS;

  const rows = (
    <ul className="flex flex-col gap-2">
      {list.map((a) => (
        <li key={a.id} className="flex items-center gap-2">
          <form action={switchAccount} className="min-w-0 flex-1">
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="next" value={next} />
            <button className="flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-surface">
              <Avatar name={a.tag} src={avatarUrl(a.avatar)} className="h-9 w-9" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{mode === "signin" ? t("people.accounts.continueAs", { name: a.tag }) : a.tag}</span>
                <span className="truncate text-meta text-muted">@{a.handle}</span>
              </span>
              {mode === "profile" && <span className="ml-auto shrink-0 text-sm text-brand">{t("people.accounts.switch")}</span>}
            </button>
          </form>
          <form action={forgetSavedAccount}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="next" value={mode === "signin" ? "/signin" : "/profile#accounts"} />
            <button className="btn btn-sm btn-outline" aria-label={t("people.accounts.forget", { handle: a.handle })} title={t("people.accounts.forget", { handle: a.handle })}>
              ✕
            </button>
          </form>
        </li>
      ))}
    </ul>
  );

  if (mode === "signin") {
    return (
      <section aria-labelledby="saved-accounts" className="card flex flex-col gap-2 p-4">
        <h2 id="saved-accounts" className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.accounts.savedTitle")}</h2>
        {rows}
      </section>
    );
  }
  return (
    <section id="accounts" aria-labelledby="accounts-title" className="card flex scroll-mt-24 flex-col gap-2 p-4">
      <h2 id="accounts-title" className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.accounts.title")}</h2>
      <p className="text-sm text-muted">{t("people.accounts.note", { n: MAX_SAVED_ACCOUNTS })}</p>
      {list.length > 0 && rows}
      {full ? (
        <p className="text-sm text-muted">{t("people.accounts.full", { n: MAX_SAVED_ACCOUNTS })}</p>
      ) : (
        <form action={addAccount}>
          <button className="btn btn-sm btn-outline">{t("people.accounts.add")}</button>
        </form>
      )}
    </section>
  );
}
