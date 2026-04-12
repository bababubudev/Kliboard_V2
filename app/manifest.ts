import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kliboard",
    short_name: "Kliboard",
    description:
      "Temporary text clipboard. Create named spaces, paste text, share via space name. Auto-deletes after your chosen duration.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0f0f",
    theme_color: "#0d0f0f",
    icons: [
      {
        src: "/icon",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
