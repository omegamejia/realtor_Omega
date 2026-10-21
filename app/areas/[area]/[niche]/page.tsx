import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site, getNiche, getArea, isSellerNiche, nearbyAreas } from "@/site.config";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { RichContent, sectionId } from "@/components/RichContent";
import {
  Bleed,
  EdEyebrow,
  SectionNav,
  ProcessStrip,
  BleedCrumbs,
  AreaContext,
  processStepFor,
} from "@/components/editorial";
import { ButtonLink } from "@/components/ui";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { RelatedLinks } from "@/components/RelatedLinks";
import { relatedPosts } from "@/lib/related-posts";
import { moneySchema } from "@/lib/schema";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";

export function generateStaticParams() {
  const niches = [...site.buyerNiches, ...site.sellerNiches];
  return site.serviceAreas.flatMap((a) =>
    niches.map((n) => ({ area: a.slug, niche: n.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string; niche: string }>;
}): Promise<Metadata> {
  const { area: areaSlug, niche: nicheSlug } = await params;
  const area = getArea(areaSlug);
  const niche = getNiche(nicheSlug);
  if (!area || !niche) return { title: "Not found" };
  const content = getPageContent(`/areas/${areaSlug}/${nicheSlug}`);
  return {
    title: content?.metaTitle ?? `${niche.title} in ${area.name}`,
    description:
      content?.metaDescription ??
      `${niche.summary} ${area.name}, ${site.location.city}.`,
  };
}

export default async function MoneyPage({
  params,
}: {
  params: Promise<{ area: string; niche: string }>;
}) {
  const { area: areaSlug, niche: nicheSlug } = await params;
  const area = getArea(areaSlug);
  const niche = getNiche(nicheSlug);
  if (!area || !niche) notFound();

  const seller = isSellerNiche(niche.slug);
  const hub = seller ? "sellers" : "buyers";
  const hubName = seller ? "For sellers" : "For buyers";
  const content = getPageContent(`/areas/${areaSlug}/${nicheSlug}`);

  return (
    <>
      <JsonLd data={moneySchema(area, niche, seller, content?.faqs)} />

      {/* Money pages are usually the FIRST page a visitor sees from search,
          so they get the same full-bleed opening as the home page rather than
          a thinner version of it. */}
      <Bleed
        image={area.heroImage || niche.heroImage || site.business.heroImageUrl}
        size="tall"
      >
        <BleedCrumbs
          items={[
            { name: "Home", href: "/" },
            { name: hubName, href: `/${hub}` },
            { name: area.name, href: `/areas/${area.slug}` },
            { name: niche.menuLabel, href: `/areas/${area.slug}/${niche.slug}` },
          ]}
        />
        <EdEyebrow>
          {area.name} · {niche.menuLabel}
        </EdEyebrow>
        <h1 className="display-h1 display-hero max-w-4xl">
          {content?.h1 ?? `${niche.title} in ${area.name}`}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/85">{niche.summary}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/contact">Talk about {area.name}</ButtonLink>
          <ButtonLink href={`/areas/${area.slug}`} variant="on-dark">
            All of {area.name}
          </ButtonLink>
        </div>
      </Bleed>

      {content ? (
        <SectionNav
          items={content.sections.map((s) => ({
            href: `#${s.id ?? sectionId(s.heading)}`,
            label: s.heading.split(" ").slice(0, 3).join(" "),
          }))}
        />
      ) : null}

      {content ? (
        <div className="container-page py-8">
          <RichContent
          content={content}
          processStep={processStepFor(niche.slug, seller ? "selling" : "buying")}
        />
        </div>
      ) : (
        <div className="container-page py-8">
          <ScaffoldBanner />
          <RichContent
            content={scaffoldFor("money", {
              city: area.name,
              niche: niche.title,
              audience: seller ? "Sellers" : "Buyers",
            })}
          />
        </div>
      )}

      <AreaContext area={area} nicheLabel={niche.menuLabel} />

      <ProcessStrip
        context={`in ${area.name}`}
        track={seller ? "selling" : "buying"}
      />


      {/* HARD RULE interlinking: up to hub + niche pillar, across to siblings, + contact CTA */}
      <RelatedLinks
        heading={`${niche.menuLabel}: keep exploring`}
        links={[
          { label: `${area.name} overview`, href: `/areas/${area.slug}` },
          { label: niche.title, href: `/${hub}/${niche.slug}` },
          ...nearbyAreas(area).map((a) => ({
            label: `${niche.menuLabel} in ${a.name}`,
            href: `/areas/${a.slug}/${niche.slug}`,
          })),
          ...relatedPosts({
            places: [area.name, area.parentCity, ...nearbyAreas(area).map((a) => a.name)],
            keywords: [niche.menuLabel, niche.title],
            page: `/areas/${area.slug}/${niche.slug}`,
          }),
        ]}
      />
    </>
  );
}
