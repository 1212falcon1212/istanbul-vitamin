import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/yonetim",
          "/yonetim/",
          "/odeme",
          "/odeme/",
          "/sepet",
          "/sepet/",
          "/hesabim",
          "/hesabim/",
          "/giris-yap",
          "/kayit-ol",
          "/sifremi-unuttum",
          "/sifremi-sifirla",
          "/favoriler",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
