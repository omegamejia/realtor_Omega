import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site, nearbyAreas } from "@/site.config";
import { ButtonLink } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { RelatedLinks } from "@/components/RelatedLinks";
import { areaSchema } from "@/lib/schema";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";

export function generateStaticParams() {
  return site.serviceAreas.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area: slug } = await params;
  const area = site.serviceAreas.find((a) => a.slug === slug);
  if (!area) return { title: "Neighborhoods" };
  const content = getPageContent(`/areas/${slug}`);
  return {
    title: content?.metaTitle ?? area.name,
    description: content?.metaDescription ?? area.blurb,
  };
}

export default async function AreaHub({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area: slug } = await params;
  const area = site.serviceAreas.find((a) => a.slug === slug);
  if (!area) notFound();

  const content = getPageContent(`/areas/${slug}`);

  return (
    <>
      <JsonLd data={areaSchema(area, content?.faqs)} />

      <PageHero
        backLink={{ href: "/areas", label: "All neighborhoods" }}
        title={content?.h1 ?? area.name}
        subhead={area.blurb}
      />

      {content ? (
        <div className="container-page py-8">
          <RichContent content={content} />
        </div>
      ) : (
        <div className="container-page py-8">
          <ScaffoldBanner />
          <RichContent content={scaffoldFor("area-hub", { city: area.name })} />
        </div>
      )}

      {/* Matrix cross-links + map (internal linking, on every area page) */}
      <section className="border-t border-[color:var(--border)] bg-[color:var(--surface-muted)]">
        <div className="container-page grid gap-12 py-14 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
                Buying in {area.name}
              </p>
              <ul className="mt-3 space-y-1.5">
                {site.buyerNiches.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/areas/${area.slug}/${n.slug}`}
                      className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--brand)]"
                    >
                      {n.menuLabel} in {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
                Selling in {area.name}
              </p>
              <ul className="mt-3 space-y-1.5">
                {site.sellerNiches.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/areas/${area.slug}/${n.slug}`}
                      className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--brand)]"
                    >
                      {n.menuLabel} in {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <aside>
            <MapEmbed height={260} query={area.mapQuery} label={area.name} />
            <div className="mt-4">
              <ButtonLink href="/contact">Ask about {area.name}</ButtonLink>
            </div>
          </aside>
        </div>
      </section>

      {/* HARD RULE interlinking: adjacent cities + niche pillars + contact CTA */}
      <RelatedLinks
        heading={`Explore more of ${site.location.city}`}
        links={[
          ...nearbyAreas(area).map((a) => ({
            label: a.name,
            href: `/areas/${a.slug}`,
          })),
          { label: "For buyers", href: "/buyers" },
          { label: "For sellers", href: "/sellers" },
        ]}
      />
    </>
  );
}
