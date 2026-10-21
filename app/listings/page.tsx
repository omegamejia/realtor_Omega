import type { Metadata } from "next";
import { site } from "@/site.config";
import { listings } from "@/content/listings";
import { Section, Eyebrow, Heading } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { ListingSearch } from "@/components/ListingSearch";
import { RelatedLinks } from "@/components/RelatedLinks";
import { listingsPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Listings",
  description: `Current listings from ${site.brand.logoText}.`,
};

export default function ListingsPage() {
  return (
    <>
      {/* Every listing in full, not just links. This page is the single URL an
          external assistant gets pointed at, and it will not crawl one page per
          property. */}
      <JsonLd data={listingsPageSchema(listings)} />

      <PageHero
        eyebrow="Listings"
        title="Homes for sale in"
        titleAccent={site.location.city}
      />

      {/* THE AGENT'S OWN LISTINGS COME FIRST — always above the IDX feed.
          Their listings are the reason someone is on this page; the full MLS
          search is the fallback for everything else. Don't reorder these. */}
      <Section>
        {site.idx.embedUrl && (
          <div className="mb-8 max-w-2xl">
            <Eyebrow>Featured</Eyebrow>
            <Heading>{site.brand.logoText} listings</Heading>
          </div>
        )}
        <ListingSearch listings={listings} />
      </Section>

      {/* Full MLS search via the agent's IDX provider — BELOW their own listings,
          and only when configured. */}
      {site.idx.embedUrl && (
        <Section muted>
          <div className="mb-6 max-w-2xl">
            <Eyebrow>Search the MLS</Eyebrow>
            <Heading>Every other home for sale in {site.location.city}</Heading>
          </div>
          {/* THE PROVIDER'S FRAME.

              Height is viewport-relative with a floor, not a fixed 720px. An
              IDX search is a map, a filter bar and a results grid, and at 720px
              on a 390px-wide phone the provider's own page scrolls inside a
              short window — two scrollbars, one of which swallows the page
              scroll when a thumb lands in the wrong place. `min()` gives it the
              screen on a phone and a sensible panel on a desktop.

              `sandbox` is deliberately permissive about what an IDX search
              genuinely needs — scripts, forms, same-origin storage for the
              provider's own session, and top-level navigation so a click
              through to a property works. It withholds the rest. A third-party
              frame on a licensed professional's own domain should not have
              everything by default.

              There is no `allow-popups` on purpose: a provider that opens a new
              window for a listing still works through `allow-top-navigation`,
              and the absence of popups is the difference between an embed and
              an advertising surface. */}
          <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
            <iframe
              src={site.idx.embedUrl}
              title="MLS home search"
              width="100%"
              style={{ border: 0, height: "min(85vh, 900px)", minHeight: 560 }}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation-by-user-activation"
            />
          </div>
          {/* The provider renders the MLS's required attribution and the "deemed
              reliable but not guaranteed" notice INSIDE the frame, which is why
              the iframe pattern is compliant without anything here. If this is
              ever replaced with a direct feed, that stops being true and every
              listing view needs the listing firm, the listing agent and the
              disclaimer. See docs/IDX-SETUP.md. */}
        </Section>
      )}
      <RelatedLinks
        links={[
          { label: "For buyers", href: "/buyers" },
          { label: "Neighborhoods", href: "/areas" },
        ]}
      />
    </>
  );
}
