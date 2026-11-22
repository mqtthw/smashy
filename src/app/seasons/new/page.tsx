// Start a season: name, game, region and dates. The points table starts from the ready-made one.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GAMES, GAME_KEYS } from "@/lib/games";
import type { MessageKey } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import { getUserId } from "@/lib/supabase/server";
import { T } from "@/lib/i18n/client";
import { createSeason } from "../actions";
import { RegionField } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.startSeason") };
}

const ERRORS: Record<string, MessageKey> = {
  name: "season.err.name", game: "season.err.game", dates: "season.err.dates", tooMany: "season.err.tooMany", save: "season.err.save",
};

async function NewSeasonForm({ searchParams }: { searchParams: PageProps<"/seasons/new">["searchParams"] }) {
  const [{ err }, userId, t] = await Promise.all([searchParams, getUserId(), getT()]);
  if (!userId) {
    return (
      <div className="card flex flex-col gap-3 p-4">
        <p>{t("season.new.signIn")}</p>
        <Link href="/signin?next=/seasons/new" className="btn btn-md btn-primary self-start">{t("signin.pageTitle")}</Link>
      </div>
    );
  }
  await connection();
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date(today);
  end.setUTCMonth(end.getUTCMonth() + 3);
  const error = typeof err === "string" ? ERRORS[err] : undefined;
  return (
    <form action={createSeason} className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-lg bg-surface p-3 text-sm text-danger">{t(error)}</p>}
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("season.field.name")}</span>
        <input name="name" required minLength={3} maxLength={80} placeholder={t("season.field.namePlaceholder")} className="field" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("season.field.game")}</span>
        <select name="game" defaultValue="melee" className="field">
          {GAME_KEYS.map((g) => <option key={g} value={g}>{GAMES[g].name}</option>)}
        </select>
      </label>
      <RegionField defaultValue={null} label={t("season.field.region")} noneLabel={t("season.field.noRegion")} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("season.field.starts")}</span>
          <input type="date" name="starts_on" required defaultValue={iso(today)} className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{t("season.field.ends")}</span>
          <input type="date" name="ends_on" required defaultValue={iso(end)} className="field" />
        </label>
      </div>
      <p className="text-meta text-muted">{t("season.new.next")}</p>
      <button className="btn btn-lg btn-primary self-start">{t("season.new.create")}</button>
    </form>
  );
}

export default function NewSeasonPage(props: PageProps<"/seasons/new">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header>
        <Link href="/seasons" className="text-sm text-muted hover:underline">← <T k="season.title" /></Link>
        <h1 className="text-2xl font-bold"><T k="season.start" /></h1>
        <p className="text-sm text-muted"><T k="season.new.intro" /></p>
      </header>
      <Suspense fallback={null}>
        <NewSeasonForm searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
