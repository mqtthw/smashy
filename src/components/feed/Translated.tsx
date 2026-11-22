"use client";
// Small wrappers so server parts that can't read the visitor's language (post cards, built ahead of
// time on some pages) still get translated labels and tooltips: the phrase is picked in the browser.
import Link from "next/link";
import type { ComponentProps } from "react";
import ShareButton from "@/components/ui/ShareButton";
import Spoiler from "@/components/ui/Spoiler";
import { useLang, useT } from "@/lib/i18n/client";
import { ordinalFor } from "@/lib/i18n/ordinal";
import type { MessageKey, Values } from "@/lib/i18n/base";


/** A placement as an ordinal in the visitor's language. */
export function TOrdinal({ n }: { n: number }) {
  return <>{ordinalFor(useLang(), n)}</>;
}

/** A link whose aria-label and/or title are phrases. */
export function TLink({ labelKey, titleKey, values, ...props }: ComponentProps<typeof Link> & { labelKey?: MessageKey; titleKey?: MessageKey; values?: Values }) {
  const t = useT();
  return <Link {...props} aria-label={labelKey ? t(labelKey, values) : props["aria-label"]} title={titleKey ? t(titleKey, values) : props.title} />;
}

/** A phrase whose placeholders are themselves phrases (e.g. a removal reason inside a sentence). */
export function TWith({ k, inner }: { k: MessageKey; inner: Record<string, MessageKey> }) {
  const t = useT();
  return <>{t(k, Object.fromEntries(Object.entries(inner).map(([name, key]) => [name, t(key)])))}</>;
}

/** The share button with its label in the visitor's language. */
export function TShareButton({ labelKey, ...props }: Omit<ComponentProps<typeof ShareButton>, "label"> & { labelKey: MessageKey }) {
  return <ShareButton {...props} label={useT()(labelKey)} />;
}

/** A spoiler cover with its label in the visitor's language. */
export function TSpoiler({ labelKey, ...props }: Omit<ComponentProps<typeof Spoiler>, "label"> & { labelKey: MessageKey }) {
  return <Spoiler {...props} label={useT()(labelKey)} />;
}
