"use client";

// A "sign in" link that brings the visitor back to the page they were on (a like, follow or
// "I'm going" button on an event, a profile, a clip…), instead of the home page.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { signInPath } from "@/lib/returnTo";

export default function SignInLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const here = usePathname();
  // The page's ?… part too (Discuss filtered to one game, a search), read after the page loads:
  // reading it while drawing would need the whole page to wait for it.
  const [search, setSearch] = useState("");
  useEffect(() => {
    setSearch(window.location.search); // eslint-disable-line react-hooks/set-state-in-effect -- the address is only known in the browser
  }, [here]);
  const back = here ? `${here}${search}` : "/";
  return <Link {...props} href={back !== "/" ? signInPath(back) : "/signin"} />;
}
