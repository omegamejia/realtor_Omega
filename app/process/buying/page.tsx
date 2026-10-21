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

const PATH = "/process/buying";

export function generateMetadata(): Metadata {
  const c = getPageContent(PATH);
  return {
    title: c?.metaTitle ?? "How we help you buy a home, step by step",
    description: c?.metaDescription,
  };
}

/**
 * The BUYING process page. Its own template and its own steps, deliberately.
 *
 * A buyer landing on a six step listing plan learns nothing about what happens
 * to them. This page answers their sequence: money, representation, search,
 * offer, diligence, financing, keys.
 *
 * The content here varies by state more than the selling side does, so it is
 * written per agent and confirmed with them rather than shipped generic. See
 * realtor-site-setup Phase 7.1c.
 *
 * The selling process page. Every money page, niche page, blog post and CTA band deep
 * links into its section anchors, so this is the one page on the site that
 * carries the method in full. Everywhere else summarizes and points here.
 */
export default function ProcessPage() {
  // Ships unwritten. The scaffold keeps the route real and the gate keeps it
  // from launching, rather than the page 404ing while every other page on the
  // site links into it.
  const written = getPageContent(PATH);
  const content = written ?? scaffoldFor("buying", { city: site.location.city });

  return (
    <>
      <JsonLd data={processSchema(content, "buying")} />

      <Bleed image="/images/brand/hero.jpg" size="tall">
        <EdEyebrow>Buying a home</EdEyebrow>
        <h1 className="display-h1 display-hero max-w-4xl">{content.h1}</h1>
        <p className="mt-6 max-w-2xl text-lg text-white/85">
          {content.metaDescription}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/contact" variant="on-dark-solid">Start looking</ButtonLink>
          <ButtonLink href="#ready" variant="on-dark">
            Start with getting ready
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
        fieldNote={`Knowing what you can borrow is not the same as knowing what you want to spend every month. The second number is the one that decides how the next few years feel.`}
      />

      <RelatedLinks
        links={[
          { label: "Buying a home", href: "/buyers/buying-a-home" },
          { label: "First-time buyers", href: "/buyers/first-time-buyers" },
          { label: "How we sell a home", href: "/process" },
          { label: `Areas we work in ${site.location.city}`, href: "/areas" },
          { label: "Talk with us", href: "/contact" },
        ]}
      />
    </>
  );
}
