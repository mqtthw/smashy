import type { Metadata } from "next";
import { Suspense } from "react";
import { getT } from "@/lib/i18n/server";
import FollowList from "@/components/social/FollowListPage";
import { PeopleSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("event.embed.following"), robots: { index: false } };
}

export default function FollowingPage(props: PageProps<"/u/[handle]/following">) {
  return (
    <Suspense fallback={<PeopleSkeleton />}>
      {props.params.then(({ handle }) => <FollowList handle={handle.toLowerCase()} kind="following" />)}
    </Suspense>
  );
}
