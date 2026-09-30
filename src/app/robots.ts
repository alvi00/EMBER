import type { MetadataRoute } from "next";

const BASE = "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/review", "/styleguide", "/api/"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
