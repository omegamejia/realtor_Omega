import type { Metadata } from "next";
import { site } from "@/site.config";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { PageHero } from "@/components/PageHero";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";
import { pageSchema } from "@/lib/schema";
import { sampleSrc } from "@/content/sample-media";

const PATH = "/privacy";

export function generateMetadata(): Metadata {
  const c = getPageContent(PATH);
  return {
    title: c?.metaTitle ?? "privacy",
    description: c?.metaDescription,
    // Legal pages are for people who go looking, not for ranking.
    robots: { index: false, follow: true },
  };
}

/**
 * Required, not optional. Every form on this site links here in its consent
 * text, and CalOPPA requires a posted privacy policy for any commercial site
 * collecting personal information from California residents, with no revenue
 * threshold. A 404 behind a consent checkbox is a broken promise on the exact
 * page where a visitor hands over their details.
 *
 * Ships as a scaffold. The gate blocks launch until it is written WITH the
 * agent, because a policy that misdescribes where their clients' data goes is
 * worse than none.
 */
export default function LegalPage() {
  const written = getPageContent(PATH);
  const content = written ?? scaffoldFor("privacy", { city: site.location.city });

  return (
    <>
      <JsonLd
        data={pageSchema({
          path: PATH,
          title: content.h1,
          description: content.metaDescription,
          crumbs: [
            { name: "Home", path: "/" },
            { name: content.h1, path: PATH },
          ],
        })}
      />
      <PageHero
        image={sampleSrc("page.legal")} title={content.h1} subhead={content.metaDescription} />
      {written ? null : (
        <div className="container-page pt-8">
          <ScaffoldBanner />
        </div>
      )}
      <RichContent content={content} />
    </>
  );
}
