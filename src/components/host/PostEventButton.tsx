"use client";

// "📣 Post to my feed": share an upcoming event with your followers (its card comes along).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { postHostedEvent } from "@/app/host/actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export default function PostEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = useT();
  return (
    <>
      <button
        type="button"
        className="link"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await postHostedEvent(eventId);
            if (res.error) setError(res.error);
            else if (res.postId) router.push(`/post/${res.postId}`);
          })
        }
      >
        {pending ? (
        t("share.posting")
      ) : (
        <>
          <Icon name="megaphone" /> {t("share.postToFeed")}
        </>
      )}
      </button>
      {error && <span className="text-danger">{error}</span>}
    </>
  );
}
