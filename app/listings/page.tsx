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
          <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
            <iframe
              src={site.idx.embedUrl}
              title="MLS home search"
              width="100%"
              height={720}
              style={{ border: 0 }}
              loading="lazy"
            />
          </div>
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
