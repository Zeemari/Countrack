import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CounTrack",
    short_name: "CounTrack",
    description: "Turn photos of polling-unit result sheets into tamper-evident evidence.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f0",
    theme_color: "#0b6b3a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
