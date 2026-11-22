import type { MetadataRoute } from "next";

// Lets people install Smashy to their phone's home screen (Android "Install app", iPhone
// "Add to Home Screen"). It then opens full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smashy",
    short_name: "Smashy",
    description: "The smash community: results, brackets, majors, clips and your local scene.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any", // brackets and VODs are easier sideways
    background_color: "#140405",
    theme_color: "#140405",
    categories: ["games", "social", "sports"],
    icons: [
      { src: "/app-icon/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/app-icon/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My sets", url: "/my-sets" },
      { name: "Brackets", url: "/brackets" },
      { name: "Reels", url: "/reels" },
    ],
  };
}
