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
};

export default nextConfig;
