import type { MetadataRoute } from "next";

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/+$/, "") || "https://xioohtravel.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/checkout", "/success", "/orders", "/login"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
