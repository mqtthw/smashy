import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/lib/i18n/client";
import { APP_PUBLISHER, CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/contact";

/** How people reach Smashy about privacy and safety (lib/contact.ts). */
export function ContactLine() {
  return <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a>;
}

/** Who runs Smashy (lib/contact.ts). Nothing until both names are filled in. */
export function OperatorLine() {
  if (!OPERATOR_NAME || !APP_PUBLISHER) return null;
  return (
    <p>
      Smashy is run by {OPERATOR_NAME}. The App Store and Google Play apps are published by {APP_PUBLISHER} on
      Smashy&apos;s behalf. You can reach us at <ContactLine />.
    </p>
  );
}

/** Shared layout for the privacy policy and terms. The frame follows the visitor's language; the documents stay English. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 p-6 text-sm leading-relaxed [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      <header className="flex flex-col gap-1">
        <Link href="/profile" className="text-meta text-muted hover:text-foreground"><T k="ui.legal.back" /></Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-meta text-muted"><T k="ui.legal.updated" values={{ date: updated }} /></p>
      </header>
      {children}
      <p className="mt-4 text-meta text-muted">
        <Link href="/privacy" className="underline"><T k="ui.legal.privacy" /></Link> · <Link href="/terms" className="underline"><T k="ui.legal.terms" /></Link>
      </p>
    </article>
  );
}
