import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site, getFunnel } from "@/site.config";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { RelatedLinks } from "@/components/RelatedLinks";
import { GuideView } from "@/components/GuideView";
import { pageSchema } from "@/lib/schema";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";

/**
 * The lead-magnet guide itself — a real, on-site page (not a static PDF), so it
 * renders branded, is crawlable SEO content, and is scanned by the gates for
 * filler + schema like every other page. Written via the funnel-builder skill
 * into content/pages.ts, keyed `/free/<slug>/guide`. Until written it renders a
 * scaffold and fails launch:check, so a placeholder guide can never ship.
 */
export function generateStaticParams() {
  // Only magnet funnels have a guide page; event funnels have no guide.
  return site.funnels
    .filter((f) => (f.goal ?? "magnet") !== "event")
    .map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const funnel = getFunnel(slug);
  const content = getPageContent(`/free/${slug}/guide`);
  return {
    title: content?.metaTitle ?? (funnel ? funnel.title : "Guide"),
    description: content?.metaDescription ?? funnel?.subtitle,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const funnel = getFunnel(slug);
  // Event funnels have no guide — only magnet funnels do. Without this an event
  // funnel would render a bogus guide scaffold at 200, and because event guides
  // are excluded from the sitemap the launch gate would never catch it.
  if (!funnel || (funnel.goal ?? "magnet") === "event") notFound();

  const path = `/free/${slug}/guide`;
  const content = getPageContent(path);

  return (
    <>
      <JsonLd
        data={pageSchema({
          path,
          title: content?.metaTitle ?? funnel.title,
          description: content?.metaDescription ?? funnel.subtitle,
          crumbs: [
            { name: "Home", path: "/" },
            { name: funnel.title, path: `/free/${slug}` },
            { name: "Guide", path },
          ],
          faqs: content?.faqs,
        })}
      />

      {/* Counts that the guide they traded an email for was actually opened.
          Renders nothing, and does nothing when no tag is configured. */}
      <GuideView title={funnel.title} />

      <PageHero
        backLink={{ href: `/free/${slug}`, label: funnel.title }}
        title={content?.h1 ?? funnel.title}
        subhead={funnel.subtitle}
      />

      <div className="container-page py-8">
        {!content && <ScaffoldBanner />}
        <RichContent
          content={
            content ??
            scaffoldFor("guide", {
              city: site.location.city,
              niche: funnel.title,
              audience: funnel.audience === "seller" ? "sellers" : "buyers",
            })
          }
        />
      </div>

      <RelatedLinks
        links={[
          { label: funnel.audience === "seller" ? "For sellers" : "For buyers", href: `/${funnel.audience}s` },
          { label: "Neighborhoods", href: "/areas" },
          { label: "Get in touch", href: "/contact" },
        ]}
      />
    </>
  );
}
