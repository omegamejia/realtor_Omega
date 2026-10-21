import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/site.config";
import { Section, Eyebrow, Heading, Card } from "@/components/ui";
import { ProcessStrip } from "@/components/editorial";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "For Sellers",
  description: `Selling a home in ${site.location.city}? Resources for every kind of seller.`,
};

export default function SellersHub() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/sellers",
          title: `Selling in ${site.location.city}`,
          description: `Selling a home in ${site.location.city}? Resources for every kind of seller.`,
          type: "CollectionPage",
          crumbs: [
            { name: "Home", path: "/" },
            { name: "For Sellers", path: "/sellers" },
          ],
        })}
      />
      <PageHero
        eyebrow="For sellers"
        title="Selling in"
        titleAccent={site.location.city}
        subhead="Get the strategy that fits your situation, then see what it looks like in your neighborhood."
      />

      <Section>
        <div className="mb-10 max-w-2xl">
          <Heading>Seller resources</Heading>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {site.sellerNiches.map((n) => (
            <Link key={n.slug} href={`/sellers/${n.slug}`}>
              <Card>
                <h2 className="text-lg font-semibold text-[color:var(--fg)]">{n.title}</h2>
                <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{n.summary}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[color:var(--brand)]">
                  Learn more →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section muted>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>By neighborhood</Eyebrow>
          <Heading>Selling in your exact area</Heading>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {site.serviceAreas.map((a) => (
            <div key={a.slug}>
              <Link
                href={`/areas/${a.slug}`}
                className="text-base font-semibold text-[color:var(--fg)] hover:text-[color:var(--brand)]"
              >
                {a.name}
              </Link>
              <ul className="mt-3 space-y-1.5">
                {site.sellerNiches.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/areas/${a.slug}/${n.slug}`}
                      className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--brand)]"
                    >
                      {n.menuLabel} in {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <ProcessStrip track="selling" />
    </>
  );
}
