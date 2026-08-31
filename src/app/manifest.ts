import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daybook",
    short_name: "Daybook",
    description: "Household ledger: spending, bills, goals, pots and net worth.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6F8FB",
    theme_color: "#1F3864",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
