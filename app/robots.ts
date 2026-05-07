import type { MetadataRoute } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kliboard.online";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/auth/",
        "/dashboard/",
        "/space/",
        "/offline",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
