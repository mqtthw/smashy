// "Site admin" in the Feed's phone side panel, for site admins only (round 589: Matthew couldn't find
// Admin on his phone; before this it was only a small text link on Profile). Shows open reports.
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";
import { countOpenReports } from "@/lib/moderation";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";

export default async function DrawerAdmin() {
  const userId = await getUserId();
  if (!userId || !(await isSiteAdmin(userId).catch(() => false))) return null;
  const [t, reports] = await Promise.all([getT(), countOpenReports().catch(() => 0)]);
  return (
    <li>
      <Link href="/admin" prefetch={false} className="flex items-center gap-4 px-5 py-3.5 text-lg font-bold text-brand hover:bg-surface">
        <Icon name="lock" className="text-2xl" />
        <span className="flex-1">{reports ? t("people.profile.siteAdminReports", { n: reports }) : t("people.profile.siteAdmin")}</span>
      </Link>
    </li>
  );
}
