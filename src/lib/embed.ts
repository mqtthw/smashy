// A hosted bracket shown inside another website (an iframe): /host/<id>/embed. It is the only page
// other sites may put in a frame (see next.config.ts), and it has no buttons that change anything.

const attr = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The code a TO pastes into their own website. The event's name is only used as the frame's title. */
export function embedSnippet(origin: string, eventId: string, name: string, height = 640): string {
  const title = attr(`${name.trim() || "Smashy"} bracket`);
  return `<iframe src="${origin}/host/${eventId}/embed" title="${title}" width="100%" height="${height}" style="border:0;max-width:100%" loading="lazy"></iframe>`;
}

/**
 * In an embed, a link to any other page opens in a new tab: the rest of Smashy refuses to be shown
 * inside a frame. Returns the address to open, or null to let the click through (the same page:
 * another pool, a jump to a round).
 */
export function outsideLink(href: string, here: string): string | null {
  let at: URL;
  let to: URL;
  try {
    at = new URL(here);
    to = new URL(href, at);
  } catch {
    return null;
  }
  if (to.protocol !== "http:" && to.protocol !== "https:") return null;
  return to.origin === at.origin && to.pathname === at.pathname ? null : to.toString();
}

/** True when this page is being shown inside another page (a frame). */
export function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // reading window.top can throw across sites: that is a frame
  }
}
