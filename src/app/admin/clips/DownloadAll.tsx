"use client";

import { useState } from "react";

/**
 * Downloads every uploaded video in the list, one after another (a short gap between them, or
 * browsers drop all but the first). The browser may ask once to allow several downloads.
 */
export default function DownloadAll({ files }: { files: { href: string; name: string }[] }) {
  const [busy, setBusy] = useState(false);
  if (files.length < 2) return null;
  const run = async () => {
    setBusy(true);
    for (const f of files) {
      const a = document.createElement("a");
      a.href = f.href;
      a.download = f.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 800));
    }
    setBusy(false);
  };
  return (
    <button type="button" onClick={run} disabled={busy} className="btn btn-sm btn-primary self-start">
      {busy ? "Downloading…" : `Download all ${files.length} uploaded videos`}
    </button>
  );
}
