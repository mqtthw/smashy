// The default link preview for Smashy (pages without their own).
import { OG_SIZE, OG_TYPE, siteCard } from "@/lib/ogCard";

export const alt = "Smashy: everything Smash. Locals and brackets, clips, results, and guides for new players.";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return siteCard();
}
