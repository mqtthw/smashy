// "Help build Smashy" (round 653, Matthew): where the Reddit posts send people who want to help. Character
// resources, missing locals, history fixes and feedback, in one form anyone can use (no account needed).
// Site admins read them on Admin → Suggestions.
import Link from "next/link";
import { Suspense } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import { LangProvider, T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/siteMeta";
import { SUGGESTION_KINDS, type SuggestionKind } from "@/lib/suggestionForm";
import { PageSkeleton } from "@/components/ui/Skeleton";
import HelpForm from "./HelpForm";

export const metadata = pageMeta(
  "Help build Smashy",
  "Smashy is a work in progress. Share a character resource, a missing local, a history fix or feedback with Smashy's team.",
);

const CARDS: { kind: SuggestionKind; icon: IconName; title: MessageKey; body: MessageKey }[] = [
  { kind: "resource", icon: "file", title: "ui.help.kind.resource", body: "ui.help.kind.resourceBody" },
  { kind: "local", icon: "pin", title: "ui.help.kind.local", body: "ui.help.kind.localBody" },
  { kind: "history", icon: "trophy", title: "ui.help.kind.history", body: "ui.help.kind.historyBody" },
  { kind: "feedback", icon: "chat", title: "ui.help.kind.feedback", body: "ui.help.kind.feedbackBody" },
];

async function Help({ searchParams }: { searchParams: PageProps<"/help">["searchParams"] }) {
  const sp = await searchParams;
  const initialKind = (SUGGESTION_KINDS as readonly string[]).includes(String(sp.kind)) ? (sp.kind as SuggestionKind) : "resource";
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <LangProvider lang={lang}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {CARDS.map((c) => (
          <li key={c.kind} className="card flex flex-col gap-1 p-4">
            <h2 className="flex items-center gap-2 font-bold"><Icon name={c.icon} /> {t(c.title)}</h2>
            <p className="text-sm text-muted">{t(c.body)}</p>
            <Link href={`/help?kind=${c.kind}#send`} scroll={false} className="text-sm font-semibold text-brand">{t("ui.help.tell")}</Link>
          </li>
        ))}
      </ul>
      <section id="send" aria-labelledby="send-title" className="flex scroll-mt-4 flex-col gap-2">
        <h2 id="send-title" className="font-bold">{t("ui.help.formTitle")}</h2>
        <HelpForm key={initialKind} initialKind={initialKind} />
        <p className="text-meta text-muted">
          {t("ui.help.historyForm")}{" "}
          <Link href="/history/suggest" className="link">{t("ui.help.historyFormLink")}</Link>
        </p>
        <p className="text-meta text-muted">
          {t("ui.help.email")} <a href="mailto:smashy.help@gmail.com" className="link">smashy.help@gmail.com</a>
        </p>
      </section>
    </LangProvider>
  );
}

export default function HelpPage(props: PageProps<"/help">) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="ui.help.title" /></h1>
        <p className="text-muted"><T k="ui.help.intro" /></p>
      </header>
      <Suspense fallback={<PageSkeleton />}>
        <Help searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
