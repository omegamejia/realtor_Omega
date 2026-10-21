import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
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
 * launchReady: false → disallow everything except the pages the phone
 *                      assistant learns from (see assistantPaths).
 * launchReady: true  → allow, and advertise the sitemap.
 *
 * robots.txt alone does not guarantee de-indexing of externally linked URLs, so
 * app/layout.tsx sets a matching `robots` meta tag from the same flag.
 */

/**
 * The pages the AI phone assistant's knowledge base is built from (the
 * `voice-agent` skill). An agent can start with listings and the assistant long
 * before the rest of the site launches, and a crawler that honours robots.txt
 * would otherwise train on nothing. GoHighLevel does not document whether its
 * crawler does, so these stay open rather than finding out on a live call.
 *
 * Opening them does not put them in Google. The two feeds send
 * `X-Robots-Tag: noindex`, and every page carries the noindex meta tag until
 * launch; allowing the crawl is what lets a search engine read that tag at all.
 */
function assistantPaths(): string[] {
  const paths = ["/ai-brief", "/listings/"];
  if (site.voiceAgent.includeTeamPages) paths.push("/team/");
  return paths;
}

export default function robots(): MetadataRoute.Robots {
  if (!site.launchReady) {
    return { rules: { userAgent: "*", allow: assistantPaths(), disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
    // Resolved, not read off config: while site.url is still a placeholder this
    // told crawlers the canonical host was [YOURDOMAIN].com.
    host: siteUrl() || undefined,
  };
}
