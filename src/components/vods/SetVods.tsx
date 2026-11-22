// The videos added to a set: the first plays here, the others are listed under it. Members can add
// one; whoever added a video (or a site admin) can remove it.
import Link from "next/link";
import EmbedPlayer from "@/components/highlights/EmbedPlayer";
import { toEmbed } from "@/lib/embeds";
import { isSiteAdmin } from "@/lib/scenes";
import { getSetVods, vodsAddedBy } from "@/lib/setVods";
import type { VodSource } from "@/lib/vods";
import { RemoveVod, VodForm } from "./VodForm";
import { getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";

export default async function SetVods({ source, setId, userId, className = "" }: { source: VodSource; setId: string; userId: string | null; className?: string }) {
  const vods = await getSetVods(source, setId).catch(() => []);
  const [mine, admin] = await Promise.all([vodsAddedBy(vods.map((v) => v.id), userId), userId && vods.length ? isSiteAdmin(userId).catch(() => false) : Promise.resolve(false)]);
  const embeds = vods.map((v) => ({ v, embed: toEmbed(v.url) })).filter((x) => x.embed);
  if (!embeds.length && !userId) return null;
  const [first, ...rest] = embeds;
  const t = await getT();
  return (
    <section aria-labelledby={`vods-${setId}`} className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={`vods-${setId}`} className="font-bold">{embeds.length ? t("vods.ofThisSet") : t("vods.title")}</h2>
        <Link href="/vods" className="text-meta text-muted hover:text-foreground">{t("vods.all")}</Link>
      </div>
      {first && (
        <div className="flex flex-col gap-1">
          <EmbedPlayer embed={first.embed!} />
          {(mine.has(first.v.id) || admin) && (
            <div className="flex justify-end">
              <RemoveVod id={first.v.id} />
            </div>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <ul className="card divide-y divide-line">
          {rest.map(({ v, embed }) => (
            <li key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <a href={v.url} target="_blank" rel="nofollow ugc noopener noreferrer" className="min-w-0 flex-1 truncate link">
                {embed!.provider}: {v.url.replace(/^https:\/\/(www\.)?/, "")}
              <NewTab /></a>
              {(mine.has(v.id) || admin) && <RemoveVod id={v.id} />}
            </li>
          ))}
        </ul>
      )}
      {userId ? <VodForm source={source} setId={setId} /> : null}
    </section>
  );
}
