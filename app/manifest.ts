import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kanto't Pakpakan Restaurant System",
    short_name: "Kanto't",
    description: "Restaurant management system for Kanto't Pakpakan",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf4ef",
    theme_color: "#b95422",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
