/**
 * 301 REDIRECT MAP — for domain migrations (switching an existing live domain
 * onto this site). Populated by the `domain-setup` skill from a crawl of the
 * OLD site's URLs.
 *
 * Every old URL that had traffic or inbound links maps to its closest new URL,
 * so ranking equity transfers instead of dying in 404s. Map to the closest
 * relevant page — NOT everything to the homepage (Google treats that as
 * soft-404s).
 *
 * Each entry: { source: "/old-path", destination: "/new-path", permanent: true }
 * `permanent: true` emits a 301 (tells search engines the move is permanent).
 *
 * Empty in the seed — a brand-new domain needs none.
 *
 * Example:
 *   { source: "/communities/brentwood", destination: "/areas/brentwood", permanent: true },
 *   { source: "/sell", destination: "/sellers/selling-your-home", permanent: true },
 */
export const redirects = [];
