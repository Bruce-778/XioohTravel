import type { MetadataRoute } from "next";
import { adLandingPages } from "@/lib/adLandingPages";

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/+$/, "") || "https://xioohtravel.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/vehicle-guide", priority: 0.8 },
    { path: "/luggage-guide", priority: 0.8 },
    { path: "/drivers", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/contact", priority: 0.6 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    ...adLandingPages.map((page) => ({ path: `/en/${page.slug}`, priority: 0.85 })),
  ];

  return routes.map(({ path, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));
}
