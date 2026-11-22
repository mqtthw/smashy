"use client";

import { useOptimistic, useTransition } from "react";
import { setNotificationMutes } from "./actions";
import { useT } from "@/lib/i18n/client";

const TYPES = [
  { key: "like", label: "people.notif.like" },
  { key: "reaction", label: "people.notif.reaction" },
  { key: "repost", label: "people.notif.repost" },
  { key: "quote", label: "people.notif.quote" },
  { key: "reply", label: "people.notif.reply" },
  { key: "mention", label: "people.notif.mention" },
  { key: "follow", label: "people.notif.follow" },
  { key: "vote", label: "people.notif.vote" },
  { key: "event_reminder", label: "people.notif.eventReminder" },
  { key: "weekly_digest", label: "people.notif.weeklyDigest" },
  { key: "play_request", label: "playnow.settings.requests" },
] as const;

/** Which notifications you get. Switched-off types don't show (in the list or the badge). */
export default function NotificationSettings({ muted }: { muted: string[] }) {
  const t = useT();
  const [value, setValue] = useOptimistic(muted);
  const [, startTransition] = useTransition();
  const toggle = (key: string, on: boolean) =>
    startTransition(async () => {
      const next = on ? value.filter((k) => k !== key) : [...value, key];
      setValue(next);
      await setNotificationMutes(next);
    });
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 font-semibold">{t("people.notif.legend")}</legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {TYPES.map((type) => (
          <label key={type.key} className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={!value.includes(type.key)} onChange={(e) => toggle(type.key, e.target.checked)} />
            {t(type.label)}
          </label>
        ))}
      </div>
      <p className="text-meta text-muted">{t("people.notif.always")}</p>
    </fieldset>
  );
}
