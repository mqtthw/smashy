import MainBadge from "@/components/MainBadge";
import { badgeMain } from "@/lib/mainBadge";
import { avatarUrl } from "@/lib/avatarLinks";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFollowList } from "@/lib/follows";
import { createClient, getUserId } from "@/lib/supabase/server";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";

/** Followers / Following list for a profile. Protected accounts' lists are only shown to the owner. */
export default async function FollowList({ handle, kind }: { handle: string; kind: "followers" | "following" }) {
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) notFound();
  const [userId, t] = await Promise.all([getUserId(), getT()]);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, tag, handle, protected").eq("handle", handle).maybeSingle();
  if (!profile) notFound();
  const isMe = profile.id === userId;
  const people = profile.protected && !isMe ? [] : await getFollowList(profile.id, kind);

  return (
    <section className="flex flex-col">
      <header className="flex flex-col gap-2 border-b border-line p-4">
        <Link href={`/u/${profile.handle}`} className="text-sm text-muted hover:text-foreground">← {profile.tag}</Link>
        <h1 className="sr-only">{profile.tag}: {kind === "followers" ? t("feed.follow.followers") : t("feed.following")}</h1>
        <nav className="flex gap-4 text-sm">
          {(["followers", "following"] as const).map((k) => (
            <Link key={k} href={`/u/${profile.handle}/${k}`} aria-current={k === kind ? "page" : undefined} className={k === kind ? "font-bold" : "text-muted"}>
              {k === "followers" ? t("feed.follow.followers") : t("feed.following")}
            </Link>
          ))}
        </nav>
      </header>
      {profile.protected && !isMe ? (
        <p className="p-4 text-muted"><Icon name="lock" /> {t("feed.follow.private")}</p>
      ) : people.length === 0 ? (
        <p className="p-4 text-muted">{kind === "followers" ? t("feed.follow.noFollowers") : t("feed.follow.notFollowing")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/u/${p.handle}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                <Avatar name={p.tag} src={avatarUrl(p.avatar_path)} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.tag}</span> <MainBadge main={badgeMain(p.mains)} />
                  <span className="block truncate text-sm text-muted">@{p.handle}</span>
                  {p.bio && <span className="block truncate text-sm">{p.bio}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
