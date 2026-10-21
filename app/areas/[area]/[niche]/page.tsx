import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site, getNiche, getArea, isSellerNiche, nearbyAreas } from "@/site.config";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { RelatedLinks } from "@/components/RelatedLinks";
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

      <PageHero
        breadcrumbs={[
          { name: hubName, path: `/${hub}` },
          { name: area.name, path: `/areas/${area.slug}` },
          { name: niche.menuLabel, path: `/areas/${area.slug}/${niche.slug}` },
        ]}
        title={content?.h1 ?? `${niche.title} in ${area.name}`}
        subhead={niche.summary}
      />

      {content ? (
        <div className="container-page py-8">
          <RichContent content={content} />
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
        ]}
      />
    </>
  );
}
