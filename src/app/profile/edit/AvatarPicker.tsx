"use client";

import { useRef, useState, useTransition } from "react";
import Avatar from "@/components/ui/Avatar";
import { shrinkImage } from "@/lib/shrinkImage";
import { deleteAvatar, uploadAvatar } from "./actions";
import AvatarCropper from "./AvatarCropper";
import { useT } from "@/lib/i18n/client";

/** Profile picture: pick one and crop it (it's checked for safety before it shows), re-crop it, or remove it. */
export default function AvatarPicker({ tag, current }: { tag: string; current: string | null }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The picture being cropped: a new one (a temporary blob: link) or the current one.
  const [cropping, setCropping] = useState<string | null>(null);

  const closeCropper = () => {
    if (cropping?.startsWith("blob:")) URL.revokeObjectURL(cropping);
    setCropping(null);
    if (input.current) input.current.value = "";
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setCropping(URL.createObjectURL(await shrinkImage(file))); // also turns phone photos the right way up
    } catch {
      setError(t("people.avatar.readFailed"));
      if (input.current) input.current.value = "";
    }
  };

  const upload = (picture: Blob) => {
    closeCropper();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", new File([picture], "avatar.jpg", { type: "image/jpeg" }));
      const res = await uploadAvatar(fd);
      if (res.error) setError(res.error);
    });
  };

  return (
    <section className="flex items-center gap-4" aria-label={t("people.avatar.aria")}>
      <Avatar name={tag} src={current} size="lg" />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <button type="button" disabled={pending} onClick={() => input.current?.click()} className="btn btn-sm btn-outline">
            {pending ? t("people.avatar.checking") : current ? t("people.avatar.change") : t("people.avatar.add")}
          </button>
          {current && (
            <button type="button" disabled={pending} onClick={() => { setError(null); setCropping(current); }} className="btn btn-sm btn-ghost">
              {t("people.avatar.adjust")}
            </button>
          )}
          {current && (
            <button type="button" disabled={pending} onClick={() => startTransition(() => deleteAvatar())} className="btn btn-sm btn-ghost">
              {t("people.avatar.remove")}
            </button>
          )}
        </div>
        <p className="text-meta text-muted">{t("people.avatar.help")}</p>
        {error && <p role="alert" className="text-meta text-danger">{error}</p>}
      </div>
      {cropping && <AvatarCropper src={cropping} onCancel={closeCropper} onDone={upload} />}
    </section>
  );
}
