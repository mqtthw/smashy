"use client";

import { useActionState, useEffect, useState } from "react";
import { keepValuesOnSubmit } from "@/lib/forms";
import { signInWithAppleToken, signInWithEmail, verifyEmailCode, type CodeState, type FormState } from "./actions";
import { appPlatform } from "@/lib/nativePush";
import { SIGNIN_SENDER } from "@/lib/contact";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

const field = "field";

export function EmailForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInWithEmail, {});
  const [email, setEmail] = useState("");
  // "Use a different email" hides this answer (compared by identity, so the next send shows again).
  const [dismissed, setDismissed] = useState<FormState | null>(null);
  const t = useT();

  if (state.sentTo && dismissed !== state) {
    return (
      <div className="rounded-2xl bg-surface p-4 text-sm">
        <p className="font-semibold"><Icon name="mail" /> {t("signin.checkEmail")}</p>
        <p className="mt-1 text-muted">{t("signin.sentTo", { email: state.sentTo })}</p>
        <CodeForm email={state.sentTo} />
        <p className="mt-3 text-muted">
          <b className="text-foreground">{t("signin.cantFind")}</b> {t("signin.spamHelp", { from: SIGNIN_SENDER })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ResendButton sent={state} email={state.sentTo} next={next} action={action} pending={pending} />
          <button type="button" onClick={() => setDismissed(state)} className="btn btn-sm btn-outline">
            {t("signin.otherEmail")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-2">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="text-sm text-muted">{t("signin.emailLabel")}</label>
      <div className="flex gap-2">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${field} min-w-0 flex-1`}
        />
        <button disabled={pending} className="shrink-0 btn btn-md btn-outline">
          {t("signin.sendLink")}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

/** Supabase sends one email a minute to the same address, so "Send again" waits that long after each send. */
const RESEND_WAIT_S = 60;

function ResendButton({ sent, email, next, action, pending }: {
  sent: FormState; email: string; next: string; action: (f: FormData) => void; pending: boolean;
}) {
  const t = useT();
  const [left, setLeft] = useState(RESEND_WAIT_S);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- each new answer from the server restarts the wait
    setLeft(RESEND_WAIT_S);
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [sent]);
  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <button disabled={pending || left > 0} className="btn btn-sm btn-outline tabular-nums">
        {left > 0 ? t("signin.sendAgainIn", { s: left }) : t("signin.sendAgain")}
      </button>
    </form>
  );
}

/** Typing the code from the sign-in email instead of opening its link (the way in from the store apps). */
function CodeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<CodeState, FormData>(verifyEmailCode, {});
  const t = useT();
  return (
    <form action={action} className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
      <input type="hidden" name="email" value={email} />
      <label htmlFor="code" className="text-muted">{t("signin.codeLabel")}</label>
      <div className="flex gap-2">
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={12}
          required
          placeholder="12345678"
          className="field min-w-0 flex-1 tracking-widest tabular-nums"
        />
        <button disabled={pending} className="shrink-0 btn btn-md btn-primary">
          {t("signin.codeSubmit")}
        </button>
      </div>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
    </form>
  );
}

/** Shown on the website only, not inside the store apps (Google sign-in doesn't work there). */
export function WebOnly({ children }: { children: React.ReactNode }) {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- whether this is the app is only known in the browser
    setInApp(appPlatform() !== null);
  }, []);
  return inApp ? null : <>{children}</>;
}

/** Google's "G", in its own colours (Google's sign-in branding asks for it on the button). */
export function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20" className="shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

type AppleSignInPlugin = { authorize: (o: { nonce: string }) => Promise<{ identityToken: string; authorizationCode?: string }> };
const applePlugin = () =>
  (window as Window & { Capacitor?: { Plugins?: { AppleSignIn?: AppleSignInPlugin } } }).Capacitor?.Plugins?.AppleSignIn ?? null;

/** A random value for this one sign-in; Apple gets its SHA-256, Supabase checks the token against it. */
async function nonces(): Promise<{ raw: string; hashed: string }> {
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return { raw, hashed: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("") };
}

/**
 * Sign in with Apple, shown only inside the iPhone app (builds from round 431 on carry the native
 * part). Apple requires it next to Discord sign-in there (guideline 4.8).
 */
export function AppleSignInButton({ next = "" }: { next?: string }) {
  const [plugin, setPlugin] = useState<AppleSignInPlugin | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the app's plugins only exist in the browser
    if (appPlatform() === "ios") setPlugin(applePlugin());
  }, []);
  if (!plugin) return null;

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const { raw, hashed } = await nonces();
      const { identityToken, authorizationCode } = await plugin.authorize({ nonce: hashed });
      const res = await signInWithAppleToken(identityToken, raw, next, authorizationCode);
      if (res?.error) setError(res.error);
    } catch (e) {
      // Closing Apple's sheet isn't an error. (A successful sign-in leaves by redirect, which ends up here
      // only as Next's own redirect signal: rethrow it.)
      const code = (e as { code?: string })?.code;
      if (code === "canceled") return;
      if (code !== "failed" && (e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      setError(t("signin.appleFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => void signIn()} disabled={busy} className="btn btn-lg w-full bg-black text-white hover:opacity-90 dark:bg-white dark:text-black">
        <span aria-hidden></span> {t("signin.apple")}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
