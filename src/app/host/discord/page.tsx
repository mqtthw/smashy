// Add the Smashy bot to a Discord server: the invite link, a code to link the server to your events, and
// the servers linked to you.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { getLang, getT } from "@/lib/i18n/server";
import { localeFor } from "@/lib/i18n/core";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { T } from "@/lib/i18n/client";
import { unlinkDiscordServer } from "./actions";
import DiscordCode from "./DiscordCode";
import NewTab from "@/components/ui/NewTab";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.discord") };
}

async function Content() {
  const [userId, t, lang] = await Promise.all([getUserId(), getT(), getLang()]);
  const appId = process.env.DISCORD_APP_ID;
  const invite = appId && /^\d{5,25}$/.test(appId) ? `https://discord.com/oauth2/authorize?client_id=${appId}&scope=applications.commands` : null;
  if (!userId) {
    return (
      <div className="card flex flex-col gap-3 p-4">
        <p>{t("hostrun.bot.signIn")}</p>
        <Link href="/signin?next=/host/discord" className="btn btn-md btn-primary self-start">{t("signin.pageTitle")}</Link>
      </div>
    );
  }
  const { data } = await createAdminClient().from("discord_servers").select("guild_id, linked_at").eq("host_id", userId).order("linked_at", { ascending: false }).limit(20);
  const servers = (data ?? []) as { guild_id: string; linked_at: string }[];
  return (
    <>
      <ol className="flex flex-col gap-3">
        <li className="card flex flex-col gap-2 p-4">
          <p className="font-semibold">{t("hostrun.bot.step1")}</p>
          {invite ? <a href={invite} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-primary self-start">{t("hostrun.bot.add")}<NewTab /></a> : <p className="text-sm text-muted">{t("hostrun.bot.notReady")}</p>}
          <p className="text-meta text-muted">{t("hostrun.bot.permissions")}</p>
        </li>
        <li className="card flex flex-col gap-2 p-4">
          <p className="font-semibold">{t("hostrun.bot.step2")}</p>
          <DiscordCode />
        </li>
        <li className="card flex flex-col gap-1 p-4">
          <p className="font-semibold">{t("hostrun.bot.step3")}</p>
          <ul className="text-sm text-muted">
            <li><code>/bracket</code> · {t("hostrun.bot.cmdBracket")}</li>
            <li><code>/upcoming</code> · {t("hostrun.bot.cmdUpcoming")}</li>
            <li><code>/results</code> · {t("hostrun.bot.cmdResults")}</li>
            <li><code>/season</code> · {t("hostrun.bot.cmdSeason")}</li>
            <li><code>/player</code> · {t("hostrun.bot.cmdPlayer")}</li>
            <li><code>/next</code> · {t("hostrun.bot.cmdNext")}</li>
          </ul>
        </li>
      </ol>
      {servers.length > 0 && (
        <section aria-labelledby="linked-servers" className="flex flex-col gap-2">
          <h2 id="linked-servers" className="font-bold">{t("hostrun.bot.linked")}</h2>
          <ul className="card divide-y divide-line text-sm">
            {servers.map((s) => (
              <li key={s.guild_id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  {t("hostrun.bot.server", { id: `…${s.guild_id.slice(-6)}` })}
                  <span className="block text-meta text-muted">{new Date(s.linked_at).toLocaleDateString(localeFor(lang), { month: "short", day: "numeric", year: "numeric" })}</span>
                </span>
                <form action={unlinkDiscordServer}>
                  <input type="hidden" name="guild" value={s.guild_id} />
                  <button className="btn btn-sm btn-outline">{t("hostrun.bot.unlink")}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-meta text-muted">{t("hostrun.bot.privacy")}</p>
    </>
  );
}

export default function DiscordBotPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-bold"><T k="hostrun.bot.title" /></h1>
        <p className="text-sm text-muted"><T k="hostrun.bot.intro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={3} />}>
        <Content />
      </Suspense>
    </section>
  );
}
