"use client";

// A link that preloads its page only when someone is about to open it (round 1010): the pointer
// rests on it, it's touched, or it gets keyboard focus. An ordinary Link preloads as soon as it's on
// screen; for the menu, shown on every page, that was ~13 preloads per visit (four server requests
// each), and pages built by crawlers that run scripts fired them all too. In the week to Nov 27 those
// preloads were about 40% of Smashy's server time.
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & { href: string };

export default function IntentLink({ href, onPointerEnter, onTouchStart, onFocus, ...rest }: Props) {
  const router = useRouter();
  const warm = () => router.prefetch(href);
  return (
    <Link
      href={href}
      prefetch={false}
      onPointerEnter={(e) => { warm(); onPointerEnter?.(e); }}
      onTouchStart={(e) => { warm(); onTouchStart?.(e); }}
      onFocus={(e) => { warm(); onFocus?.(e); }}
      {...rest}
    />
  );
}
