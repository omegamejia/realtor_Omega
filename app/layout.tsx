import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { site, agentCredential } from "@/site.config";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { JsonLd } from "@/components/JsonLd";
import { Analytics } from "@/components/Analytics";
import { baseGraph } from "@/lib/schema";
import { brandVariants } from "@/lib/brand-colors";
import { siteUrl } from "@/lib/site-url";

/**
 * HEAD METADATA FOR THE WHOLE SITE.
 *
 * Two things here are easy to miss and were both absent until October 2026, on
 * every site ever generated from this seed:
 *
 * CANONICAL. `metadataBase` + a RELATIVE canonical ("./") makes Next resolve one
 * canonical per route against the current pathname, so all several hundred pages
 * get a correct `<link rel="canonical">` from this single declaration. Without
 * it, a site with an /areas/<town>/<niche> matrix hands Google a few hundred
 * near-identical URLs and no statement of which one is real — which is the
 * difference between "these are variations of a page" and "these are duplicates."
 *
 * Note it must stay RELATIVE. A literal `canonical: siteUrl()` here would point
 * every page on the site at the homepage, which is worse than having none.
 *
 * SOCIAL PREVIEW. `openGraph` and `twitter` are what Facebook, Instagram,
 * LinkedIn, WhatsApp and iMessage read when somebody shares a link. With them
 * absent a shared link renders as bare text — no image, no headline — which for
 * an agent whose distribution IS social sharing is the single most expensive
 * missing tag on the site. Per-page titles and descriptions flow into these
 * automatically; the image comes from app/opengraph-image.tsx.
 *
 * Both are verified by `npm run launch:check` (Layers 11 and 12), because the
 * lesson of their absence is that nothing invisible stays fixed unless a gate
 * watches it.
 */
const base = siteUrl();

export const metadata: Metadata = {
  // Local development resolves to "", and `new URL("")` throws — so fall back to
  // localhost, which is the truth on a machine nobody else can reach.
  metadataBase: new URL(base || "http://localhost:3000"),
  title: {
    default: `${site.agent.name} · ${agentCredential()} in ${site.location.city}`,
    template: `%s · ${site.agent.name}`,
  },
  description: site.agent.tagline,
  // Relative on purpose — see the note above. Next resolves it per route.
  alternates: { canonical: "./" },
  // Deliberately NO title/description here. Next falls back to each page's own
  // resolved `title` and `description` when openGraph omits them — so an area
  // page shares as that area rather than as the site. Declaring them here would
  // pin every share on the site to the homepage's words, which was the first
  // version of this and is a quiet downgrade: the link previews, so it looks
  // fixed, and every one of several hundred pages shares the same headline.
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: site.brand.logoText || site.agent.name,
    url: "./",
  },
  twitter: { card: "summary_large_image" },
  // Matches robots.ts. A meta tag is what actually keeps an externally-linked
  // placeholder page out of the index; robots.txt only asks crawlers not to look.
  robots: site.launchReady
    ? undefined
    : { index: false, follow: false, nocache: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Brand colors flow into every component through these CSS variables.
  // Derived brand variants are computed from real luminance (lib/brand-colors)
  // rather than a fixed CSS color-mix, so ANY brand color works — including
  // near-black and near-white, where a fixed percentage mix fails contrast.
  const v = brandVariants(site.brand.primaryColor);
  const brandVars = {
    "--brand": site.brand.primaryColor,
    "--accent": site.brand.accentColor,
    "--brand-cta-light": v.ctaLight,
    "--brand-cta-dark": v.ctaDark,
    "--brand-ink-light": v.inkLight,
    "--brand-ink-dark": v.inkDark,
    "--on-brand-light": v.onBrandLight,
    "--on-brand-dark": v.onBrandDark,
  } as CSSProperties;

  return (
    // Brand vars live on <html> (:root) so every derived token in globals.css
    // (--brand-cta, --surface-muted, --brand-hover…) can resolve var(--brand).
    // On <body> they'd be invisible to :root and those tokens compute empty.
    <html lang="en" style={brandVars}>
      <head>
        {/* Preload both faces. next/font used to do this; declaring the faces in
            CSS means doing it here instead. Worth keeping: without it the serif
            headings arrive a beat late on a cold load. */}
        <link
          rel="preload"
          href="/fonts/Inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Fraunces-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        {/* No-flash theme: apply a saved manual choice before paint. Absent a
            saved value, we leave data-theme unset so the OS preference (via the
            media query in globals.css) applies. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`,
          }}
        />
        {/* Base structured data — Organization + WebSite + LocalBusiness +
            Person — on every page by default. */}
        <JsonLd data={baseGraph()} />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <ChatWidget />
        {/* The agent's own pixel and analytics tags. Renders nothing at all
            until they put their own IDs in site.config.ts → tracking. */}
        <Analytics />
      </body>
    </html>
  );
}
