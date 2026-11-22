"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useT } from "@/lib/i18n/client";

/**
 * "QR code" button: shows a big QR code for an invite link, so someone at a local can scan it off
 * your phone. Made in the browser; nothing is sent anywhere.
 */
export default function InviteQR({ code, usesLeft = 1 }: { code: string; usesLeft?: number }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (svg) dialog.current?.showModal();
  }, [svg]);

  const open = async () => {
    const link = `${window.location.origin}/invite/${code}`;
    setUrl(link);
    setSvg(await QRCode.toString(link, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }));
  };

  return (
    <>
      <button type="button" onClick={open} className="btn btn-sm btn-ghost">{t("people.qr.button")}</button>
      {svg && (
        <dialog
          ref={dialog}
          onClose={() => setSvg(null)}
          onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
          aria-label={t("people.qr.aria")}
          className="m-auto w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-background p-5 text-foreground backdrop:bg-black/60"
        >
          <h2 className="mb-1 text-lg font-bold">{t("people.qr.title")}</h2>
          <p className="mb-3 text-meta text-muted">{usesLeft > 1 ? t("people.qr.many", { n: usesLeft }) : t("people.qr.once")}</p>
          {/* The QR code is generated locally from the invite link (safe markup from the qrcode library). */}
          <div className="mx-auto w-full max-w-64 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-3 break-all text-center font-mono text-xs text-muted">{url}</p>
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-sm btn-outline mt-4 w-full">{t("people.qr.done")}</button>
        </dialog>
      )}
    </>
  );
}
