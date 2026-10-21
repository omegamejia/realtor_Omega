"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { site } from "@/site.config";
import { trackContact, trackingIds } from "@/lib/tracking";
import { captureAttribution } from "@/lib/attribution";

/**
 * The agent's own measurement tags: advertising (Meta), analytics (Google), and
 * behaviour (Microsoft Clarity — heatmaps and session recordings).
 *
 * Nothing renders until they put their own IDs in `site.config.ts` → `tracking`,
 * so a site that was never told about any of this loads no third-party script at
 * all. These are THEIR accounts: nothing here reports to KMC or to anyone else,
 * which is also what keeps the privacy policy honest — it names the vendors the
 * agent chose, and `launch:check` fails a site whose policy names none of them.
 *
 * What is deliberately NOT here:
 *
 * - **No personal data in events.** Meta's advanced matching and Google's
 *   enhanced conversions are off. An event says a lead happened, never who.
 * - **No consent banner.** These sites are US-facing and the disclosure route is
 *   a written privacy policy (CalOPPA). An agent advertising into the EU or UK
 *   needs consent BEFORE these load, which this does not do — see
 *   `.claude/rules/legal-compliance.md` §9.
 * - **No recording of what people type.** Clarity masks sensitive content by
 *   default and that default is never turned off here.
 */

/** IDs are typed into a config file by a human and interpolated into an inline
 *  script, so anything that is not an ID shape is dropped rather than executed. */
function safeId(id: string | undefined): string {
  return id && /^[A-Za-z0-9_-]{4,40}$/.test(id) ? id : "";
}

export function Analytics() {
  const ids = trackingIds();
  const metaPixelId = safeId(ids.metaPixelId);
  const googleTagId = safeId(ids.googleTagId);
  const clarityProjectId = safeId(ids.clarityProjectId);
  const pathname = usePathname();
  const anyTag = Boolean(metaPixelId || googleTagId);

  // Meta counts one PageView when its script loads and never notices a
  // click-through to another page, because this site navigates without a full
  // reload. GA4 handles that itself through enhanced measurement; Meta does not,
  // so every later page is counted here.
  //
  // The first run is skipped deliberately. The snippet below already counts the
  // landing page, and whether this effect runs before or after that snippet is
  // an accident of caching and hydration timing — so without the guard a warm
  // cache double-counts every landing page, halving the apparent cost per result
  // of every ad pointing at it.
  // Record where this visit came from, once, on the first page of the session.
  // Runs whether or not a tag is configured: the value of knowing which advert
  // produced a lead is in the CRM, not in anybody's ad dashboard.
  useEffect(() => {
    captureAttribution();
  }, []);

  const countedFirst = useRef(false);
  useEffect(() => {
    if (!metaPixelId) return;
    if (!countedFirst.current) {
      countedFirst.current = true;
      return;
    }
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    fbq?.("track", "PageView");
  }, [pathname, metaPixelId]);

  // Tapping the phone number IS the conversion on a phone, and it never reaches
  // the CRM, so an agent who only counted form fills would conclude their site
  // does nothing. One listener on the document catches every call, email and
  // directions link on the site — nothing to remember when a component is added.
  useEffect(() => {
    if (!anyTag) return;
    function onClick(e: MouseEvent) {
      const link = (e.target as HTMLElement | null)?.closest?.("a");
      const href = link?.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) trackContact("phone");
      else if (href.startsWith("mailto:")) trackContact("email");
      else if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(href)) trackContact("directions");
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [anyTag]);

  if (!metaPixelId && !googleTagId && !clarityProjectId) return null;

  return (
    <>
      {googleTagId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
            strategy="afterInteractive"
          />
          <Script id="google-tag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleTagId}');`}
          </Script>
        </>
      ) : null}

      {metaPixelId ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              alt=""
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}

      {clarityProjectId ? (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityProjectId}");`}
        </Script>
      ) : null}
    </>
  );
}
