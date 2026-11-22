// Which bottom-bar / side-bar tab is lit for a page. A tab covers its own path and the pages under it
// ("/events" lights for "/events/genesis-x4"), but not other paths that only start with the same
// letters ("/play" must not light for "/players/16105").
export function isTabActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
