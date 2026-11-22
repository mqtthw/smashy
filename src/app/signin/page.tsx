import { authErrorText, readAuthErrorCode } from "@/lib/authErrors";
import SavedAccounts from "@/components/accounts/SavedAccounts";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import { AGE_BLOCK_COOKIE } from "@/lib/age";
import { getUserId } from "@/lib/supabase/server";
import { signInWithDiscord, signInWithGoogle } from "./actions";
import { getAuthProviders } from "@/lib/authProviders";
import { INVITE_COOKIE, isInviteOnly } from "@/lib/invites";
import { AppleSignInButton, EmailForm, GoogleMark, WebOnly } from "./forms";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { safeReturnPath } from "@/lib/returnTo";
import LanguageSwitch from "@/components/LanguageSwitch";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.join") };
}

/** The steps in the visitor's language from the first paint (the forms are client components). */
async function SignInSteps(props: Pick<PageProps<"/signin">, "searchParams">) {
  const steps = await Steps(props);
  return <LangProvider lang={await getLang()}>{steps}</LangProvider>;
}

async function Steps({ searchParams }: Pick<PageProps<"/signin">, "searchParams">) {
  if (await getUserId()) redirect("/welcome");

  const cookieStore = await cookies();
  const { error, next: nextParam } = await searchParams;
  const t = await getT();
  const next = safeReturnPath(nextParam) ?? "";
  // Only Smashy's own codes are shown: never words taken from the address (round 683).
  const errorCode = readAuthErrorCode(error);

  if (cookieStore.get(AGE_BLOCK_COOKIE)) {
    return (
      <div className="rounded-2xl bg-surface p-4">
        <p className="font-semibold">{t("signin.tooYoung")}</p>
        <p className="mt-1 text-sm text-muted">{t("signin.tooYoungBody")}</p>
        <Link href="/events" className="mt-3 inline-block text-sm text-brand">{t("signin.browseEvents")}</Link>
      </div>
    );
  }

  const providers = await getAuthProviders();
  return (
    <div className="flex flex-col gap-5">
      {errorCode && <p role="alert" className="rounded-lg bg-surface p-3 text-sm text-danger">{authErrorText(t, errorCode)}</p>}
      {/* Accounts saved on this device (round 699): back in with one tap. */}
      <SavedAccounts mode="signin" next={next || "/"} />
      <AppleSignInButton next={next} />
      {providers.google && (
        <WebOnly>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button className="btn btn-lg w-full gap-2 border border-[#dadce0] bg-white text-[#1f1f1f] hover:bg-[#f8f9fa]">
              <GoogleMark />
              {t("signin.google")}
            </button>
          </form>
        </WebOnly>
      )}
      <form action={signInWithDiscord}>
        <input type="hidden" name="next" value={next} />
        <button className="btn btn-lg w-full bg-[#5865F2] text-white hover:opacity-90">
          {t("signin.discord")}
        </button>
      </form>
      {/* Until sign-in emails go through Smashy's own mail setup (docs/launch-checklist.md), point people to Discord. */}
      {process.env.NEXT_PUBLIC_EMAIL_SIGNIN_READY !== "1" ? (
        <p className="-mt-3 text-center text-xs text-muted">{t("signin.discordBeta")}</p>
      ) : (
        <p className="-mt-3 text-center text-xs text-muted">{t(providers.google ? "signin.quickWays" : "signin.discordReady")}</p>
      )}
      <EmailForm next={next} />
      <p className="text-xs text-muted">
        {t("people.birthday.ageRule")} {t("signin.agreeBefore")} <Link href="/terms" className="underline">{t("signin.terms")}</Link> {t("signin.and")}{" "}
        <Link href="/privacy" className="underline">{t("signin.privacy")}</Link>{t("common.period")}
      </p>
    </div>
  );
}

/** Private beta: explain that joining needs an invite (and confirm one was picked up from a link). */
async function BetaNotice() {
  if (!(await isInviteOnly())) return null;
  const code = (await cookies()).get(INVITE_COOKIE)?.value;
  const t = await getT();
  return (
    <p className="mt-3 rounded-lg border border-line bg-surface p-3 text-sm">
      {code ? (
        t("signin.inviteSaved", { code })
      ) : (
        t("signin.privateBeta")
      )}
    </p>
  );
}

export default function SignInPage(props: PageProps<"/signin">) {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <header>
        <LanguageSwitch className="mb-2 justify-end" />
        <h1 className="flex flex-wrap items-baseline gap-x-2 text-2xl font-bold"><T k="signin.title" /> <Logo className="text-4xl" /></h1>
        <p className="text-muted"><T k="signin.intro" /></p>
        <Suspense fallback={null}>
          <BetaNotice />
        </Suspense>
      </header>
      <Suspense fallback={<PageSkeleton />}>
        <SignInSteps searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
