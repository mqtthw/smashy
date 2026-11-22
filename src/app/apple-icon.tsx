// Home-screen icon for phones ("Add to Home Screen"). iOS rounds the corners itself,
// so this one is a full square.
import { renderIcon } from "@/lib/iconArt";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderIcon(180, false);
}
