import type { MetadataRoute } from "next";
import { site, absoluteUrl } from "@/site.config";

/**
 * robots.txt — allows all crawlers and points them at the sitemap.
 * The sitemap URL uses site.url, so it resolves to the real domain once the
 * agent sets it during setup.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  };
}
