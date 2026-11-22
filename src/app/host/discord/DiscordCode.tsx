"use client";
// A code to type in Discord (/smashy connect code:…), good for 15 minutes and one use.
import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import { makeDiscordCode } from "./actions";

export default function DiscordCode() {
  const t = useT();
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const command = code ? `/smashy connect code:${code}` : "";
  return (
    <div className="flex flex-col gap-2">
      {code ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-lg tracking-wider">{command}</code>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => navigator.clipboard?.writeText(command).then(() => setCopied(true), () => {})}
            >
              {copied ? t("common.copied") : t("common.copy")}
            </button>
          </div>
          <p className="text-meta text-muted">{t("hostrun.bot.codeHelp")}</p>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          className="btn btn-md btn-outline self-start"
          onClick={() =>
            start(async () => {
              const res = await makeDiscordCode().catch(() => ({ error: true as const }));
              if ("code" in res && res.code) {
                setCode(res.code);
                setCopied(false);
                setFailed(false);
              } else setFailed(true);
            })
          }
        >
          {t("hostrun.bot.makeCode")}
        </button>
      )}
      {failed && <p className="text-sm text-danger">{t("hostrun.bot.codeFailed")}</p>}
    </div>
  );
}
