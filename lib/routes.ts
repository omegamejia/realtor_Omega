import { site, allNiches } from "@/site.config";
import { posts } from "@/content/posts";
import { listings } from "@/content/listings";

/**
 * The single source of truth for "what pages exist" on this site.
 *
 * Two consumers want different answers from this list and used to share one:
 *
 *  - **The launch gate** wants EVERY route, including funnel pages, because its
 *    job is to prove no page anywhere is still unwritten.
 *  - **The sitemap** wants only INDEXABLE routes, because submitting a URL that
 *    carries `noindex` is a contradiction and Search Console reports it as an
 *    error ("Submitted URL marked noindex").
 *
 * Serving both from sitemap.xml meant one of the two had to be wrong. Splitting
 * them here keeps the gate's coverage complete and stops the sitemap making a
 * claim the page itself contradicts.
 *
 * Add a new page type under app/ and add it here too.
 */

/** Routes that deliberately carry `noindex` (see app/free/[slug]). Lead-magnet
 *  opt-in pages are thin by design and the delivered guide is the reward for
 *  opting in, so neither should rank. They are still gate-checked. */
export function isNoIndex(path: string): boolean {
  return path.startsWith("/free/");
}

/** Every route the site renders. */
export function allRoutes(): string[] {
  const paths: string[] = [
    "/",
    "/buyers",
    "/sellers",
    // The method page. Every seller-side page links into its anchors and the
    // HowTo schema lives here, so it must be crawlable and gate-checked.
    "/process",
    "/areas",
    "/awards",
    "/media",
    "/listings",
    "/listings/details",
    "/ai-brief",
    "/team",
    "/blog",
    "/contact",
    "/privacy",
    "/terms",
  ];

  for (const n of site.buyerNiches) paths.push(`/buyers/${n.slug}`);
  for (const n of site.sellerNiches) paths.push(`/sellers/${n.slug}`);

  for (const a of site.serviceAreas) {
    paths.push(`/areas/${a.slug}`);
    for (const n of allNiches) paths.push(`/areas/${a.slug}/${n.slug}`);
  }

  for (const m of site.team) paths.push(`/team/${m.slug}`);

  for (const f of site.funnels) {
    paths.push(`/free/${f.slug}`);
    if ((f.goal ?? "magnet") !== "event") paths.push(`/free/${f.slug}/guide`);
  }

  for (const p of posts) paths.push(`/blog/${p.slug}`);
  for (const l of listings) paths.push(`/listings/${l.slug}`);

  return paths;
}

/** Routes that belong in /sitemap.xml. */
export function indexableRoutes(): string[] {
  return allRoutes().filter((p) => !isNoIndex(p));
}
