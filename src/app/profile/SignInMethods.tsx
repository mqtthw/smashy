// "How you sign in" on your profile (round 684): the account's email, the ways in that are connected, and
// buttons to connect Google or Discord as well. Losing access to the one way you joined no longer means
// losing the Smashy account.
import { getAuthProviders } from "@/lib/authProviders";
import { authErrorText, readAuthErrorCode } from "@/lib/authErrors";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleMark, WebOnly } from "../signin/forms";
import { connectSignInMethod } from "./signin-methods-actions";
import { SIGNIN_METHOD_NAMES as NAMES, signInProviders } from "@/lib/signInMethods";
import ChangeEmail from "./ChangeEmail";

export default async function SignInMethods({ linked, linkError, emailChange }: { linked?: string; linkError?: string; emailChange?: string }) {
  const t = await getT();
  const supabase = await createClient();
  const [{ data }, providers] = await Promise.all([supabase.auth.getUser(), getAuthProviders()]);
  const user = data.user;
  if (!user) return null;
  const have = signInProviders(user.identities, user.email);
  const errorCode = readAuthErrorCode(linkError);
  const justLinked = linked && have.includes(linked) ? NAMES[linked] : null;

  return (
    <section id="signin-methods" aria-labelledby="signin-methods-title" className="card flex scroll-mt-24 flex-col gap-2 p-4">
      <h2 id="signin-methods-title" className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.signin.title")}</h2>
      <p className="text-sm text-muted">{t("people.signin.note")}</p>
      <ul className="flex flex-col gap-1 text-sm">
        {have.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <span aria-hidden className="text-success">✓</span>
            <span className="font-semibold">{NAMES[p]}</span>
            {p === "email" && user.email && <span className="min-w-0 truncate text-muted">{user.email}</span>}
          </li>
        ))}
      </ul>
      {/* Changing email (round 685): one link opened, or the change finished. */}
      {user.new_email ? (
        <p role="status" className="text-sm text-muted">
          {t(emailChange === "half" ? "people.signin.emailHalf" : "people.signin.emailPending", { new: user.new_email })}
        </p>
      ) : emailChange === "done" && user.email ? (
        <p role="status" className="text-sm text-success">{t("people.signin.emailChanged", { email: user.email })}</p>
      ) : (
        user.email && <ChangeEmail current={user.email} />
      )}
      {justLinked && <p role="status" className="text-sm text-success">{t("people.signin.added", { name: justLinked })}</p>}
      {errorCode && <p role="alert" className="text-sm text-danger">{authErrorText(t, errorCode)}</p>}
      <div className="flex flex-wrap gap-2">
        {providers.google && !have.includes("google") && (
          <WebOnly>
            <form action={connectSignInMethod}>
              <input type="hidden" name="provider" value="google" />
              <button className="btn btn-sm btn-outline">
                <GoogleMark /> {t("people.signin.connect", { name: "Google" })}
              </button>
            </form>
          </WebOnly>
        )}
        {!have.includes("discord") && (
          <form action={connectSignInMethod}>
            <input type="hidden" name="provider" value="discord" />
            <button className="btn btn-sm btn-outline">{t("people.signin.connect", { name: "Discord" })}</button>
          </form>
        )}
      </div>
    </section>
  );
}
