import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import { CHARACTERS } from "@/lib/characters";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { HIGHLIGHT_TYPES, type HighlightType } from "@/lib/highlightTypes";
import { createClient, getUserId } from "@/lib/supabase/server";
import NewHighlightForm from "./form";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.addHighlight") };
}

async function Gate({ searchParams }: { searchParams: PageProps<"/highlights/new">["searchParams"] }) {
  const userId = await getUserId();
  if (!userId) redirect(signInPath("/highlights/new"));
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("games").eq("id", userId).maybeSingle();
  if (!p) redirect("/welcome");
  const { game, character, vs, type } = await searchParams;
  const first = GAME_KEYS.includes(game as GameKey)
    ? (game as GameKey)
    : ((p.games as string[]).find((g): g is GameKey => GAME_KEYS.includes(g as GameKey)) ?? "melee");
  const presetCharacter = typeof character === "string" && CHARACTERS[first].some((c) => c.key === character) ? character : "";
  const presetVs = presetCharacter && typeof vs === "string" && vs !== presetCharacter && CHARACTERS[first].some((c) => c.key === vs) ? vs : "";
  const presetType = typeof type === "string" && type in HIGHLIGHT_TYPES ? (type as HighlightType) : presetVs ? "matchup" : "combo_video";
  return (
    <LangProvider lang={await getLang()}>
      <NewHighlightForm defaultGame={first} defaultCharacter={presetCharacter} defaultVs={presetVs} defaultType={presetType} />
    </LangProvider>
  );
}

export default function NewHighlightPage(props: PageProps<"/highlights/new">) {
  return (
    <section className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-bold"><T k="media.hl.addTitle" /></h1>
        <p className="text-muted"><T k="media.hl.addIntro" /></p>
      </header>
      <Suspense fallback={<PageSkeleton />}>
        <Gate searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
