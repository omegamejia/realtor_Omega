import type { MetadataRoute } from "next";
import { site, absoluteUrl } from "@/site.config";

/**
 * robots.txt
 *
 * Indexability is driven by `launchReady`. Setup deliberately deploys early so
 * the agent can see their site, which means a real domain briefly serves pages
 * full of [BRACKETS]. Without this, Google can index those placeholders on the
 * agent's own domain — a bad first impression that can outrank the finished
 * pages later.
 *
 * launchReady: false → disallow everything.
 * launchReady: true  → allow, and advertise the sitemap.
 *
 * robots.txt alone does not guarantee de-indexing of externally linked URLs, so
 * app/layout.tsx sets a matching `robots` meta tag from the same flag.
 */
export default function robots(): MetadataRoute.Robots {
  if (!site.launchReady) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  };
}
