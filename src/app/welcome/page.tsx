import { getRegionEvents } from "@/lib/events";
import { tagFromSignIn } from "@/lib/signupPrefill";
import Link from "next/link";
import { detectedRegion } from "@/lib/viewerRegion";
import { HOME_REGION } from "@/lib/regions";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { INVITE_COOKIE } from "@/lib/invites";
import { RETURN_COOKIE, safeReturnPath } from "@/lib/returnTo";
import { createClient, getUserId } from "@/lib/supabase/server";
import WelcomeForm from "./form";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.welcome") };
}

async function Setup() {
  const userId = await getUserId();
  if (!userId) redirect("/signin");

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  // Signing in again: back to the page that asked them to sign in, if any.
  if (profile) redirect(safeReturnPath((await cookies()).get(RETURN_COOKIE)?.value) ?? "/profile");

  // No profile yet: make sure the account still exists (a browser can hold a login for a deleted account).
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) redirect("/auth/signout");

  const jar = await cookies();
  // Private beta: a code is needed (an invite link fills it in).
  const { data: needsInvite } = await supabase.rpc("needs_invite");
  const region = (await detectedRegion()) ?? HOME_REGION;
  const [citySuggestions, lang] = await Promise.all([citiesIn(region), getLang()]);
  return (
    <LangProvider lang={lang}>
    <WelcomeForm
      currentYear={new Date().getFullYear()}
      needsInvite={needsInvite === true}
      inviteCode={jar.get(INVITE_COOKIE)?.value ?? ""}
      defaultRegion={region}
      citySuggestions={citySuggestions}
      suggestedTag={tagFromSignIn(userData.user?.app_metadata?.provider, userData.user?.user_metadata)}
    />
    </LangProvider>
  );
}

/** The cities with the most Smash events in a region (suggestions for "Home city"). */
async function citiesIn(region: string): Promise<string[]> {
  const events = await getRegionEvents(region).catch(() => null);
  const counts = new Map<string, number>();
  for (const t of events?.tournaments ?? []) if (t.city) counts.set(t.city, (counts.get(t.city) ?? 0) + 1);
  for (const w of events?.expected ?? []) if (w.city) counts.set(w.city, (counts.get(w.city) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([c]) => c);
}

export default function WelcomePage() {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold"><T k="feed.welcome.title" /></h1>
        <p className="text-muted"><T k="feed.welcome.setup" /></p>
        <p className="mt-2 text-sm">
          <T k="feed.discuss.newToSmash" /> <Link href="/new" className="link"><T k="feed.welcome.corner" /></Link><T k="feed.welcome.cornerAfter" />
        </p>
      </header>
      <Suspense fallback={<PageSkeleton />}>
        <Setup />
      </Suspense>
    </section>
  );
}
