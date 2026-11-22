"use client";

import { useRef, useState } from "react";
import { removePushSubscription } from "@/app/push-actions";
import { useT } from "@/lib/i18n/client";

/** Turns off push notifications on this device (removes its saved subscription). Never throws. */
export async function forgetPushOnThisDevice() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  } catch {
    // Never block signing out.
  }
}

/**
 * Sign out, after turning off this device's push notifications, so a shared phone stops showing the
 * old account's messages and replies.
 */
export default function SignOutButton({ action }: { action: () => Promise<void> }) {
  const ready = useRef(false); // true once push is cleaned up: let the real submit through
  const [busy, setBusy] = useState(false);
  const t = useT();
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (ready.current) return;
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        void forgetPushOnThisDevice().then(() => {
          ready.current = true;
          form.requestSubmit();
        });
      }}
    >
      <button className="text-muted underline">{busy ? t("play.push.signingOut") : t("play.push.signOut")}</button>
    </form>
  );
}
