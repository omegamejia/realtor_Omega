import type { Metadata } from "next";
import { Newsreader, Montserrat } from "next/font/google";
import type { CSSProperties } from "react";
import "./globals.css";
import "./tb.css";

// TWO FACES: one light serif set large, one geometric sans set small.
//
//   Newsreader  every headline, statement and number. Weight 300 and 200.
//               The optical-size axis matters: at display sizes the browser
//               picks the high-contrast cut automatically, which is what makes
//               a 48px sentence look engraved rather than enlarged.
//   Montserrat  labels, links, body copy and the form.
//
// Both are variable fonts, so no weight list: the file carries every weight and
// the stylesheet asks for exactly the ones it uses.
//
// Named `--font-newsreader` and `--font-montserrat` rather than the generic
// `--font-display` / `--font-sans`, because globals.css and tb.css declare
// those on :root — on the same element next/font writes to — and the generic
// names are assembled there with real fallbacks. See app/tb.css.
//
// The brand kit's Times New Roman and Lato are one line each to put back:
// point --font-display and --font-sans at them in tb.css.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
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
    <html lang="en" style={brandVars} className={`${newsreader.variable} ${montserrat.variable}`}>
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
