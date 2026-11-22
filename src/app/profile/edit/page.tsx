import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ADULT_AGE, ageFromBirthdate } from "@/lib/age";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { createClient, getUserId } from "@/lib/supabase/server";
import EditProfileForm from "./form";
import AvatarPicker from "./AvatarPicker";
import { avatarUrl } from "@/lib/avatarLinks";
import { parseMains } from "@/lib/characters";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.editProfile") };
}

async function Editor() {
  const userId = await getUserId();
  if (!userId) redirect(signInPath("/profile/edit"));
  const supabase = await createClient();
  const [{ data: p }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("tag, handle, home_city, bio, crew, lfg_doubles, region, games, protected, avatar_path, mains, social_twitch, social_youtube, social_x, social_instagram, social_bluesky, social_reddit, social_slippi").eq("id", userId).maybeSingle(),
    supabase.from("private_profile_data").select("date_of_birth").eq("user_id", userId).maybeSingle(),
  ]);
  const isMinor = priv ? ageFromBirthdate(priv.date_of_birth) < ADULT_AGE : true;
  if (!p) redirect("/welcome");
  const [lang, t] = await Promise.all([getLang(), getT()]);
  return (
    <LangProvider lang={lang}>
      <Link href={`/u/${p.handle}`} className="text-sm text-muted hover:text-foreground">{t("people.edit.back")}</Link>
      <h1 className="text-2xl font-bold">{t("people.profile.edit")}</h1>
      <AvatarPicker tag={p.tag} current={avatarUrl(p.avatar_path)} />
      <EditProfileForm
        tag={p.tag}
        handle={p.handle}
        homeCity={p.home_city}
        bio={p.bio}
        crew={p.crew}
        region={p.region}
        lfgDoubles={p.lfg_doubles}
        isProtected={p.protected}
        isMinor={isMinor}
        mains={parseMains(p.mains)}
        socials={{ social_twitch: p.social_twitch, social_youtube: p.social_youtube, social_x: p.social_x, social_instagram: p.social_instagram, social_bluesky: p.social_bluesky, social_reddit: p.social_reddit, social_slippi: p.social_slippi }}
        games={(p.games as string[]).filter((g): g is GameKey => GAME_KEYS.includes(g as GameKey))}
      />
    </LangProvider>
  );
}

export default function EditProfilePage() {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <Suspense fallback={<PageSkeleton />}>
        <Editor />
      </Suspense>
    </section>
  );
}
