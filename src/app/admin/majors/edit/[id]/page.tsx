// Admin: change a major added by hand to Smash history (its details and every game's results), for
// example after someone reports a mistake (docs/archive-plan.md, step A7).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { getHandMajorForEdit, HAND_GAME_BLOCKS, HAND_MAX_BLOCKS, majorHref } from "@/lib/handMajors";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import AddHandMajorForm from "../../AddHandMajorForm";

export const metadata: Metadata = { title: "Edit a major", robots: { index: false } };

async function EditMajor({ params }: { params: PageProps<"/admin/majors/edit/[id]">["params"] }) {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const { id } = await params;
  const major = await getHandMajorForEdit(id);
  if (!major) notFound();
  // One empty block after the games it has (at least the usual three), so a game can be added.
  const blocks = Math.min(HAND_MAX_BLOCKS, Math.max(HAND_GAME_BLOCKS, major.games.length + 1));
  return (
    <div className="flex flex-col gap-4">
      <AdminTabs active="majors" />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Edit: {major.name}</h2>
        <Link href={majorHref(major.slug)} className="text-sm underline">Open its page</Link>
      </div>
      <AddHandMajorForm edit={{ slug: major.slug, initial: major, blocks }} />
    </div>
  );
}

export default function EditHandMajorPage(props: PageProps<"/admin/majors/edit/[id]">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/admin/majors" className="text-sm text-muted hover:text-foreground">← Majors</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <EditMajor params={props.params} />
      </Suspense>
    </section>
  );
}
