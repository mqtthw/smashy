// Small line icons for the places an emoji used to stand in (emoji look different on every phone
// and clash with the line icons in the navigation). One style: a 24px grid, round 2px strokes, the
// color and size of the text around them. Add a new one here rather than drawing it in a component.
import type { ReactNode } from "react";
import { GAMECUBE_PATH } from "@/lib/gamecubeIcon";

const PATHS = {
  /** Where: a setup, a venue. */
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.25" />
    </>
  ),
  /** Waiting, or a time. */
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  /** On stream. */
  video: (
    <>
      <rect x="3" y="6" width="12" height="12" rx="2.5" />
      <path d="M15 10.5 21 7v10l-6-3.5z" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  /** Online. */
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5.5a2.5 2.5 0 0 0 2.5 3" />
      <path d="M16 6h2.5A2.5 2.5 0 0 1 16 9" />
      <path d="M12 13v4" />
      <path d="M8.5 20h7" />
    </>
  ),
  /** A message from the host. */
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z" />
      <path d="M18.5 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  /** A reported result, a list. */
  clipboard: (
    <>
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9.5 5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
      <path d="M9.5 11h5M9.5 15h5" />
    </>
  ),
  /** A person: a walk-in. */
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  /** Again: the next edition of a weekly. */
  repeat: (
    <>
      <path d="m17 3 3 3-3 3" />
      <path d="M4 11V9a3 3 0 0 1 3-3h13" />
      <path d="m7 21-3-3 3-3" />
      <path d="M20 13v2a3 3 0 0 1-3 3H4" />
    </>
  ),
  /** Needs attention: a player asking for the host. */
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  /** About, more information. */
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.5h.01" />
    </>
  ),
  /** A reminder sent to someone. */
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  /** Talk: replies, discussion, Discords. */
  chat: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  /** Clips and reels. */
  play: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  /** Playing: your sets, netplay. The GameCube controller from the Play tab (filled, not a line icon). */
  gamepad: <path d={GAMECUBE_PATH} fill="currentColor" stroke="none" fillRule="evenodd" />,
  /** Private or protected. */
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4c0 5.2-7 9.6-7 9.600z" />,
  mail: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m4 8 8 5.500L20 8" />
    </>
  ),
  bookmark: <path d="M7 4h10v16l-5-3.500L7 20z" />,
  /** A crew, a doubles partner. */
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M16.5 13.500A5 5 0 0 1 21 18.5" />
    </>
  ),
  /** Muted. */
  bellOff: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
      <path d="M4 4l16 16" />
    </>
  ),
  /** A photo. */
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m4 17 5-4 4 3 3-2.5 4 3.5" />
    </>
  ),
  /** Hidden until tapped: a spoiler. */
  eyeOff: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 4l16 16" />
    </>
  ),
  /** Rankings, records. */
  chart: <path d="M5 20V11M12 20V4M19 20v-7" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** `label` names the icon for screen readers when it carries meaning on its own; without one it's decoration. */
export default function Icon({ name, label, className = "" }: { name: IconName; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.125em] ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  );
}
