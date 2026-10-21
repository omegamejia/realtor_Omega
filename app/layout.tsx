import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// Two real typefaces give the site a voice instead of the OS default: a warm
// serif for display headings and a clean grotesk for body/UI. Wired as CSS
// variables so `font-sans` (body) and `font-display` (headings) resolve to them.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
import { site, agentCredential } from "@/site.config";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { JsonLd } from "@/components/JsonLd";
import { Analytics } from "@/components/Analytics";
import { baseGraph } from "@/lib/schema";
import { brandVariants } from "@/lib/brand-colors";

export const metadata: Metadata = {
  title: {
    default: `${site.agent.name} · ${agentCredential()} in ${site.location.city}`,
    template: `%s · ${site.agent.name}`,
  },
  description: site.agent.tagline,
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
    <html lang="en" style={brandVars} className={`${inter.variable} ${fraunces.variable}`}>
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
