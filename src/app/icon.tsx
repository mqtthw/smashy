// Browser tab icon (favicon): just the flame S on a see-through background (the home-screen and
// Apple icons keep the dark red tile, which phones need).
import { renderMark } from "@/lib/iconArt";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return renderMark(64);
}
