import type { Metadata } from "next";
import { site } from "@/site.config";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";
import { RelatedLinks } from "@/components/RelatedLinks";
import { Bleed, EdEyebrow, SectionNav } from "@/components/editorial";
import { ButtonLink } from "@/components/ui";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { processSchema } from "@/lib/schema";

const PATH = "/process";

export function generateMetadata(): Metadata {
  const c = getPageContent(PATH);
  return {
    title: c?.metaTitle ?? "How we sell a home, step by step",
    description: c?.metaDescription,
  };
}

/**
 * The process page. Every money page, niche page, blog post and CTA band deep
 * links into its section anchors, so this is the one page on the site that
 * carries the method in full. Everywhere else summarizes and points here.
 */
export default function ProcessPage() {
  // Ships unwritten. The scaffold keeps the route real and the gate keeps it
  // from launching, rather than the page 404ing while every other page on the
  // site links into it.
  const written = getPageContent(PATH);
  const content = written ?? scaffoldFor("process", { city: site.location.city });

  return (
    <>
      <JsonLd data={processSchema(content)} />

      <Bleed image="/images/brand/hero.jpg" size="tall">
        <EdEyebrow>The method</EdEyebrow>
        <h1 className="display-h1 display-hero max-w-4xl">{content.h1}</h1>
        <p className="mt-6 max-w-2xl text-lg text-white/85">
          {content.metaDescription}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/contact" variant="on-dark-solid">Tell us about your home</ButtonLink>
          <ButtonLink href="#impact" variant="on-dark">
            See what makes it different
          </ButtonLink>
        </div>
      </Bleed>

      <SectionNav
        items={content.sections.map((s) => ({
          href: `#${s.id ?? ""}`,
          label: s.heading.split(":")[0],
        }))}
      />

      {written ? null : (
        <div className="container-page pt-8">
          <ScaffoldBanner />
        </div>
      )}

      <RichContent
        content={content}
        breakImage={site.business.breakImageUrl || site.business.heroImageUrl}
        fieldNote={`The first week a home is live is the week it gets the most attention it will ever get. Everything before that week exists to make it count.`}
      />

      <RelatedLinks
        links={[
          { label: "Selling your home", href: "/sellers/selling-your-home" },
          { label: `What your ${site.location.city} home is worth`, href: "/sellers/home-valuation" },
          { label: "Buying a home", href: "/buyers/buying-a-home" },
          { label: `Areas we work in ${site.location.city}`, href: "/areas" },
          { label: "Talk with us", href: "/contact" },
        ]}
      />
    </>
  );
}
