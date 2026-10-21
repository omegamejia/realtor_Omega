import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site, nearbyAreas , areaMapQuery } from "@/site.config";
import { ButtonLink } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { ProcessStrip , Bleed, EdEyebrow, BleedCrumbs } from "@/components/editorial";
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

      {/* Area hubs get the same full-bleed opening as everything else, using
          the area's own photo. They were still on the plain text hero, so the
          one page most about a place was the one page not showing it. */}
      <Bleed
        image={area.heroImage || site.business.heroImageUrl}
        size="tall"
      >
        <BleedCrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Areas", href: "/areas" },
            { name: area.name, href: `/areas/${area.slug}` },
          ]}
        />
        <EdEyebrow>
          {area.parentCity ? `${area.parentCity} · ` : ""}
          {site.location.state}
        </EdEyebrow>
        <h1 className="display-h1 display-hero max-w-4xl">
          {content?.h1 ?? `Real estate in ${area.name}`}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/85">{area.blurb}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/contact" variant="on-dark-solid">
            Talk about {area.name}
          </ButtonLink>
          <ButtonLink href="/process" variant="on-dark">
            How we sell
          </ButtonLink>
        </div>
      </Bleed>

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
                      className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--brand-ink)]"
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
                      className="text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--brand-ink)]"
                    >
                      {n.menuLabel} in {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <aside>
            <MapEmbed height={260} query={areaMapQuery(area)} label={area.name} />
            <div className="mt-4">
              <ButtonLink href="/contact">Ask about {area.name}</ButtonLink>
            </div>
          </aside>
        </div>
      </section>

      {/* HARD RULE interlinking: adjacent cities + niche pillars + contact CTA */}
      <ProcessStrip context={`in ${area.name}`} />

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
