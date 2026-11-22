import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, Suspense, type ReactNode } from "react";
import GameBadge from "@/components/GameBadge";
import StageStriker from "@/components/strike/StageStriker";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { STAGES } from "@/lib/rulesetFields";
import { getAllRulesets } from "@/lib/scenes";
import { pageMeta } from "@/lib/siteMeta";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export const metadata: Metadata = pageMeta("Stage striking", "Strike stages for an in-person smash set on your phone, following your scene's ruleset.");

/** A phrase with one {placeholder} filled by a React node (a badge, a link): pass MARK as its value. */
const MARK = "\u0001";
function withNode(text: string, node: ReactNode) {
  return <>{text.split(/(\u0001)/).map((part, i) => (part === MARK ? <Fragment key={i}>{node}</Fragment> : part))}</>;
}

/** Pick a scene's ruleset to strike with, or a quick set with every common stage. */
async function Picker({ searchParams }: { searchParams: PageProps<"/strike">["searchParams"] }) {
  const { game: g } = await searchParams;
  const quick = GAME_KEYS.includes(g as GameKey) ? (g as GameKey) : null;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  if (quick) {
    return (
      <LangProvider lang={lang}>
        <Link href="/strike" className="text-sm text-muted hover:text-foreground">{t("setroom.strike.backToPicker")}</Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">{t("setroom.strike.quickTitle")} <GameBadge game={quick} /></h1>
        <p className="text-sm text-muted">{t("setroom.strike.quickIntro")}</p>
        <StageStriker
          rules={{ starters: STAGES[quick], counterpicks: [], pattern: null, bans: 2, dsr: "none", bestOf: 3 }}
          gentlemans
          allStages={STAGES[quick]}
          rulesetName={t("setroom.strike.quickRules")}
          storageKey={`quick-${quick}`}
          pickStarters
        />
      </LangProvider>
    );
  }
  const rulesets = (await getAllRulesets().catch(() => [])).filter((r) => r.latest);
  const byGame = GAME_KEYS.map((game) => ({ game, list: rulesets.filter((r) => r.game === game) })).filter((x) => x.list.length);
  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t("setroom.strike.title")}</h1>
        <p className="text-sm text-muted">{t("setroom.strike.intro")}</p>
      </header>
      {byGame.map(({ game, list }) => (
        <section key={game} className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-bold">{withNode(t("setroom.strike.gameRulesets", { game: MARK }), <GameBadge game={game} />)}</h2>
          <ul className="card divide-y divide-line">
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/rulesets/${r.id}/strike`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block truncate text-meta text-muted">{r.sceneName}</span>
                  </span>
                  <span className="text-brand">{t("setroom.strike.go")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{t("setroom.strike.noRuleset")}</h2>
        <div className="flex flex-wrap gap-2">
          {GAME_KEYS.filter((k) => !GAMES[k].legacy).map((k) => (
            <Link key={k} href={`/strike?game=${k}`} className="btn btn-sm btn-outline">{GAMES[k].short}</Link>
          ))}
        </div>
        <p className="text-meta text-muted">{withNode(t("setroom.strike.missing", { scenes: MARK }), <Link href="/scenes" className="link">{t("setroom.strike.scenes")}</Link>)}</p>
      </section>
    </LangProvider>
  );
}

export default function StrikePage(props: PageProps<"/strike">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Suspense fallback={<PageSkeleton />}>
        <Picker searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
