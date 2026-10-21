import { redirects } from "./content/redirects.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Seed sites are mostly static marketing pages. Images left unoptimized-friendly
  // so a non-technical operator can drop in any URL without config.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // 301 redirect map for domain migrations. Populated by the domain-setup skill.
  async redirects() {
    return redirects;
  },

  /**
   * Security headers.
   *
   * These were absent until October 2026, which is not a crisis on a marketing
   * site — there is no login and no session to steal — but two of them earn
   * their place here and the rest are free.
   *
   * No Content-Security-Policy. It is the one with teeth and the one that would
   * break these sites: agents paste in a GoHighLevel chat widget, an IDX search
   * frame, a Meta pixel and a Google tag, and a CSP strict enough to be worth
   * having would block whichever one nobody remembered to allow — silently, on a
   * live site, with a non-technical owner. That needs the `reporting` and
   * `ghl-integration` skills to declare their own origins first.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops a browser from second-guessing a file's declared type, which
          // is how an uploaded image gets treated as a script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the page's origin to other sites, never the full path. A
          // referrer carrying "/areas/brentwood/divorce-home-sale" tells an ad
          // network something about a visitor that nobody agreed to share —
          // the same line .claude/rules/legal-compliance.md §9 draws.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing here needs a camera, a microphone or a location.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Only the IDX provider's search frame is meant to embed this site.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Two years, preloadable. Vercel serves HTTPS only, so this costs
          // nothing and removes the first insecure request on a repeat visit.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
