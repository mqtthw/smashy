"use client";

import { useT } from "@/lib/i18n/client";

/**
 * Opens Slippi Launcher on this computer (the slippi:// link it registers when installed) and copies
 * the code. Slippi has no link that starts a match or fills in a code: the code is typed in Melee's own
 * Direct Connect menu. Hidden on phones and tablets, where there's no Launcher.
 */
export default function OpenSlippi({ code }: { code?: string | null }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={async () => {
        if (code) await navigator.clipboard?.writeText(code).catch(() => {});
        window.location.href = "slippi://open";
      }}
      title={t("playnow.slippi.title")}
      className="btn btn-sm btn-outline [@media(hover:none)]:hidden"
    >
      {t("playnow.slippi.open")}
    </button>
  );
}
