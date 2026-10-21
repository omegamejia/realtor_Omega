import type { MetadataRoute } from "next";
import { site, allNiches, absoluteUrl } from "@/site.config";
import { posts } from "@/content/posts";
import { listings } from "@/content/listings";

/**
 * The site's sitemap — and the single source of truth for "what pages exist."
 *
 * Every route is derived here from the same config + content the pages
 * themselves are built from (mirroring each route's generateStaticParams), so
 * this list can never drift from reality: rename an area, add a listing, or
 * drop a funnel and the sitemap follows automatically.
 *
 * The launch + schema gates read this (via /sitemap.xml) instead of a
 * hardcoded route list, so they always check exactly the pages that exist.
 * That's why this file must stay a faithful mirror of the app/ routes — if you
 * add a new page type under app/, add it here too.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths: string[] = [
    "/",
    "/buyers",
    "/sellers",
    // The method page. Every seller-side page links into its anchors and the
    // HowTo schema lives here, so it must be crawlable and in the gate's route
    // list (which is read from this sitemap).
    "/process",
    "/process/buying",
    "/areas",
    "/listings",
    "/team",
    "/blog",
    "/contact",
    // Legal pages: noindex, but must be crawlable and gate-checked. Every
    // form links here in its consent text.
    "/privacy",
    "/terms",
  ];

  // Niche pillar pages (app/buyers/[niche], app/sellers/[niche])
  for (const n of site.buyerNiches) paths.push(`/buyers/${n.slug}`);
  for (const n of site.sellerNiches) paths.push(`/sellers/${n.slug}`);

  // Area hubs + money pages (app/areas/[area] and app/areas/[area]/[niche] —
  // every area × every niche, matching that route's generateStaticParams).
  for (const a of site.serviceAreas) {
    paths.push(`/areas/${a.slug}`);
    for (const n of allNiches) paths.push(`/areas/${a.slug}/${n.slug}`);
  }

  // Team members (app/team/[slug])
  for (const m of site.team) paths.push(`/team/${m.slug}`);

  // Funnels: every funnel has an opt-in/RSVP page (app/free/[slug]). Magnet
  // funnels also have a guide page (app/free/[slug]/guide); event funnels don't.
  for (const f of site.funnels) {
    paths.push(`/free/${f.slug}`);
    if ((f.goal ?? "magnet") !== "event") paths.push(`/free/${f.slug}/guide`);
  }

  // Blog posts (app/blog/[slug])
  for (const p of posts) paths.push(`/blog/${p.slug}`);

  // Listings (app/listings/[slug])
  for (const l of listings) paths.push(`/listings/${l.slug}`);

  const lastModified = new Date();
  return paths.map((path) => ({ url: absoluteUrl(path), lastModified }));
}
