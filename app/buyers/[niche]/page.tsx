import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/site.config";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { ProcessStrip } from "@/components/editorial";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { RelatedLinks } from "@/components/RelatedLinks";
import { nicheSchema } from "@/lib/schema";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";

export function generateStaticParams() {
  return site.buyerNiches.map((n) => ({ niche: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string }>;
}): Promise<Metadata> {
  const { niche: slug } = await params;
  const niche = site.buyerNiches.find((n) => n.slug === slug);
  if (!niche) return { title: "For Buyers" };
  const content = getPageContent(`/buyers/${slug}`);
  return {
    title: content?.metaTitle ?? `${niche.title} in ${site.location.city}`,
    description: content?.metaDescription ?? niche.summary,
  };
}

export default async function BuyerNichePage({
  params,
}: {
  params: Promise<{ niche: string }>;
}) {
  const { niche: slug } = await params;
  const niche = site.buyerNiches.find((n) => n.slug === slug);
  if (!niche) notFound();

  const content = getPageContent(`/buyers/${slug}`);

  return (
    <>
      <JsonLd data={nicheSchema(niche, "buyers", content?.faqs, content)} />

      <PageHero
        backLink={{ href: "/buyers", label: "For buyers" }}
        title={content?.h1 ?? `${niche.title} in ${site.location.city}`}
        subhead={niche.summary}
      />

      <div className="container-page py-8">
        {!content && <ScaffoldBanner />}
        <RichContent
          content={
            content ??
            scaffoldFor("niche", {
              city: site.location.city,
              niche: niche.title,
              audience: "Buyers",
            })
          }
        />
      </div>

      {/* Down-links into the matrix: this niche in every neighborhood */}
      <section className="border-t border-[color:var(--border)] bg-[color:var(--surface-muted)]">
        <div className="container-page py-12">
          <p className="text-sm font-semibold text-[color:var(--fg)]">
            {niche.menuLabel} by neighborhood
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {site.serviceAreas.map((a) => (
              <Link
                key={a.slug}
                href={`/areas/${a.slug}/${niche.slug}`}
                className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-1.5 text-sm text-[color:var(--fg-muted)] hover:border-[var(--brand)] hover:text-[color:var(--brand-ink)]"
              >
                {niche.menuLabel} in {a.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProcessStrip track="buying" />


      <RelatedLinks
        links={[
          { label: "For buyers", href: "/buyers" },
          { label: "Neighborhoods", href: "/areas" },
        ]}
      />
    </>
  );
}
