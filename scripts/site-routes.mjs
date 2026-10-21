/**
 * Route discovery for the gates.
 *
 * Both launch-check and validate-schema scan "every page on the site." The
 * list of pages is NOT hardcoded here — it's read from the site's own
 * /sitemap.xml, which is generated from config + content (see app/sitemap.ts).
 *
 * This is deliberate: a hardcoded slug list drifts the moment content is
 * renamed (rename an area to a real city, give a listing a real address, drop
 * a seed funnel) and would leave the gate checking pages that no longer exist
 * while ignoring the ones that do. Reading the sitemap means the gates always
 * check exactly the pages that exist — no more, no less — and coverage stays
 * complete automatically. Single source of truth; see root-cause-first.md.
 */

/**
 * Fetch the site's real routes (as paths) from its rendered sitemap.
 * Throws loudly with an actionable message if the sitemap can't be read — a
 * missing/empty sitemap is itself a bug the gate should surface, not swallow.
 */
export async function fetchRoutes(base) {
  let xml;
  try {
    const res = await fetch(`${base}/sitemap.xml`);
    if (!res.ok) {
      throw new Error(
        `could not read ${base}/sitemap.xml (HTTP ${res.status}). ` +
          `Is the dev server running (npm run dev)? The gates need it to ` +
          `discover which pages to check.`
      );
    }
    xml = await res.text();
  } catch (err) {
    // Re-wrap network errors (e.g. server not running) with the same hint.
    if (err instanceof Error && err.message.includes("sitemap.xml")) throw err;
    throw new Error(
      `could not reach ${base}/sitemap.xml (${err.message}). ` +
        `Is the dev server running (npm run dev)?`
    );
  }

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) {
    throw new Error(
      `${base}/sitemap.xml contained no <loc> entries — app/sitemap.ts may be ` +
        `broken or the build is stale.`
    );
  }

  // Reduce each entry to its path so it doesn't matter what domain the sitemap
  // was generated with — the gate always scans against `base`. We strip
  // scheme://host with a regex rather than new URL(), because the seed's domain
  // is still the literal [YOURDOMAIN].com until launch, which new URL() can't
  // parse.
  const paths = locs.map((loc) => loc.replace(/^https?:\/\/[^/]+/, "") || "/");

  return [...new Set(paths)].sort();
}
